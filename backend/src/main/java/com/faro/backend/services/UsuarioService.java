package com.faro.backend.services;

import com.faro.backend.dto.UsuarioAltaRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
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
