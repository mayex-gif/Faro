package com.faro.backend.services;

import com.faro.backend.dto.UsuarioAltaRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.dto.UsuarioRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.UsuarioRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lógica de negocio de la gestión de usuarios (el personal que entra a FARO).
 * Nunca devuelve la clave: todo sale como UsuarioDTO. La clave se guarda encriptada (BCrypt).
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final CuadrillaRepository cuadrillaRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          CuadrillaRepository cuadrillaRepository,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.cuadrillaRepository = cuadrillaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Lista todo el personal (activos y dados de baja), ordenado por apellido y nombre. */
    @Transactional(readOnly = true)
    public List<UsuarioDTO> listar() {
        return usuarioRepository.findAll(Sort.by("apellido", "nombre")).stream()
                .map(UsuarioDTO::desdeEntidad)
                .toList();
    }

    /**
     * Da de alta a una persona. Reglas:
     * - el email no se puede repetir (sin importar mayúsculas) → 409; se guarda en minúsculas;
     * - el capataz tiene que tener una cuadrilla que exista (409 si falta, 404 si no existe);
     *   para los otros roles la cuadrilla se ignora (queda vacía);
     * - la clave inicial se guarda encriptada; la cuenta nace activa.
     */
    @Transactional
    public UsuarioDTO crear(UsuarioAltaRequestDTO request) {
        String email = normalizarEmail(request.email());
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new OperacionNoPermitidaException("Ya existe un usuario con ese email");
        }
        Long cuadrillaId = validarCuadrilla(request.rol(), request.cuadrillaId());

        Usuario usuario = new Usuario(
                request.nombre().trim(),
                request.apellido().trim(),
                email,
                passwordEncoder.encode(request.clave()),
                request.rol(),
                cuadrillaId,
                true
        );
        return UsuarioDTO.desdeEntidad(usuarioRepository.save(usuario));
    }

    /**
     * Modifica nombre, apellido, email, rol y cuadrilla (la clave no). Reglas:
     * - el usuario tiene que existir → 404;
     * - el email nuevo no puede ser de otra persona → 409;
     * - capataz: cuadrilla obligatoria y existente (igual que en el alta);
     * - no se le puede sacar el rol al último encargado activo (nadie más podría administrar el corralón) → 409.
     */
    @Transactional
    public UsuarioDTO modificar(Long id, UsuarioRequestDTO request) {
        Usuario usuario = buscar(id);

        String email = normalizarEmail(request.email());
        usuarioRepository.findByEmailIgnoreCase(email)
                .filter(otro -> !otro.getId().equals(id))
                .ifPresent(otro -> {
                    throw new OperacionNoPermitidaException("Ya existe un usuario con ese email");
                });

        if (dejariaDeSerEncargado(usuario, request.rol()) && esElUltimoEncargadoActivo(usuario)) {
            throw new OperacionNoPermitidaException(
                    "No se le puede cambiar el rol al último encargado activo: el corralón quedaría sin encargado");
        }
        Long cuadrillaId = validarCuadrilla(request.rol(), request.cuadrillaId());

        usuario.setNombre(request.nombre().trim());
        usuario.setApellido(request.apellido().trim());
        usuario.setEmail(email);
        usuario.setRol(request.rol());
        usuario.setCuadrillaId(cuadrillaId);
        return UsuarioDTO.desdeEntidad(usuarioRepository.save(usuario));
    }

    /**
     * Da de baja (activo = false) o reactiva (activo = true) una cuenta. No se borra nada:
     * la persona sigue en la lista y en la historia, pero no puede entrar (ni con un token viejo).
     * Reglas para la baja: nadie se da de baja a sí mismo y no se puede dar de baja al último encargado activo → 409.
     */
    @Transactional
    public UsuarioDTO cambiarActivo(Long id, boolean activo, Usuario quienLoHace) {
        Usuario usuario = buscar(id);
        if (!activo) {
            if (id.equals(quienLoHace.getId())) {
                throw new OperacionNoPermitidaException("No te podés dar de baja a vos mismo");
            }
            if (esElUltimoEncargadoActivo(usuario)) {
                throw new OperacionNoPermitidaException(
                        "No se puede dar de baja al último encargado activo: el corralón quedaría sin encargado");
            }
        }
        usuario.setActivo(activo);
        return UsuarioDTO.desdeEntidad(usuarioRepository.save(usuario));
    }

    /** Restablece la clave (por ejemplo, si alguien se la olvidó). Se guarda encriptada. */
    @Transactional
    public void restablecerClave(Long id, String claveNueva) {
        Usuario usuario = buscar(id);
        usuario.setPassword(passwordEncoder.encode(claveNueva));
        usuarioRepository.save(usuario);
    }

    private Usuario buscar(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
    }

    private static boolean dejariaDeSerEncargado(Usuario usuario, RolUsuario rolNuevo) {
        return usuario.getRol() == RolUsuario.ENCARGADO_CORRALON && rolNuevo != RolUsuario.ENCARGADO_CORRALON;
    }

    /** True si este usuario es un encargado activo y no hay otro encargado activo. */
    private boolean esElUltimoEncargadoActivo(Usuario usuario) {
        return usuario.getRol() == RolUsuario.ENCARGADO_CORRALON
                && usuario.isActivo()
                && usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON) <= 1;
    }

    private static String normalizarEmail(String email) {
        return email.trim().toLowerCase();
    }

    /** Devuelve la cuadrilla que queda guardada: la del capataz (validada) o null para los otros roles. */
    private Long validarCuadrilla(RolUsuario rol, Long cuadrillaId) {
        if (rol != RolUsuario.CAPATAZ_CUADRILLA) {
            return null;
        }
        if (cuadrillaId == null) {
            throw new OperacionNoPermitidaException("El capataz tiene que tener una cuadrilla a cargo");
        }
        if (!cuadrillaRepository.existsById(cuadrillaId)) {
            throw new RecursoNoEncontradoException("Cuadrilla no encontrada");
        }
        return cuadrillaId;
    }
}
