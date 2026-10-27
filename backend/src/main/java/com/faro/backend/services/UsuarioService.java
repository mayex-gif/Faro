package com.faro.backend.services;

import com.faro.backend.dto.CrearUsuarioRequestDTO;
import com.faro.backend.dto.ModificarUsuarioRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    @Transactional(readOnly = true)
    public List<UsuarioDTO> listar(RolUsuario rol, Boolean activo) {
        List<Usuario> usuarios;
        if (rol != null && activo != null) {
            usuarios = usuarioRepository.findByRolAndActivo(rol, activo);
        } else if (rol != null) {
            usuarios = usuarioRepository.findByRol(rol);
        } else if (activo != null) {
            usuarios = usuarioRepository.findByActivo(activo);
        } else {
            usuarios = usuarioRepository.findAll();
        }

        return usuarios.stream()
                .map(UsuarioDTO::desdeEntidad)
                .toList();
    }

    @Transactional(readOnly = true)
    public UsuarioDTO obtenerPorId(Long id) {
        return usuarioRepository.findById(id)
                .map(UsuarioDTO::desdeEntidad)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario con id: " + id));
    }

    @Transactional
    public UsuarioDTO crear(CrearUsuarioRequestDTO request) {
        String emailNormalizado = request.email().trim().toLowerCase();

        if (usuarioRepository.existsByEmailIgnoreCase(emailNormalizado)) {
            throw new OperacionNoPermitidaException("Ya existe un usuario registrado con el correo: " + emailNormalizado);
        }

        Long cuadrillaId = validarYResolverCuadrilla(request.rol(), request.cuadrillaId());

        Usuario usuario = new Usuario(
                request.nombre().trim(),
                request.apellido().trim(),
                emailNormalizado,
                passwordEncoder.encode(request.password()),
                request.rol(),
                cuadrillaId,
                request.obtenerActivoPorDefecto()
        );

        Usuario guardado = usuarioRepository.save(usuario);
        return UsuarioDTO.desdeEntidad(guardado);
    }

    @Transactional
    public UsuarioDTO modificar(Long id, ModificarUsuarioRequestDTO request, String emailOperador) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario con id: " + id));

        String emailNormalizado = request.email().trim().toLowerCase();

        if (!usuario.getEmail().equalsIgnoreCase(emailNormalizado)
                && usuarioRepository.existsByEmailIgnoreCaseAndIdNot(emailNormalizado, id)) {
            throw new OperacionNoPermitidaException("Ya existe otro usuario registrado con el correo: " + emailNormalizado);
        }

        // Validación de desactivación
        if (request.activo() != null && !request.activo() && usuario.isActivo()) {
            validarPosibleDesactivacionOInactivacion(usuario, emailOperador, "desactivar");
        }

        // Validación de cambio de rol de encargado
        if (usuario.getRol() == RolUsuario.ENCARGADO_CORRALON
                && request.rol() != RolUsuario.ENCARGADO_CORRALON
                && usuario.isActivo()
                && usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON) <= 1) {
            throw new OperacionNoPermitidaException("No es posible quitar el rol al único encargado del corralón activo en el sistema");
        }

        Long cuadrillaId = validarYResolverCuadrilla(request.rol(), request.cuadrillaId());

        usuario.setNombre(request.nombre().trim());
        usuario.setApellido(request.apellido().trim());
        usuario.setEmail(emailNormalizado);
        usuario.setRol(request.rol());
        usuario.setCuadrillaId(cuadrillaId);

        if (request.activo() != null) {
            usuario.setActivo(request.activo());
        }

        if (request.password() != null && !request.password().isBlank()) {
            usuario.setPassword(passwordEncoder.encode(request.password()));
        }

        Usuario actualizado = usuarioRepository.save(usuario);
        return UsuarioDTO.desdeEntidad(actualizado);
    }

    @Transactional
    public UsuarioDTO cambiarEstadoActivo(Long id, boolean activo, String emailOperador) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario con id: " + id));

        if (!activo && usuario.isActivo()) {
            validarPosibleDesactivacionOInactivacion(usuario, emailOperador, "desactivar");
        }

        usuario.setActivo(activo);
        Usuario actualizado = usuarioRepository.save(usuario);
        return UsuarioDTO.desdeEntidad(actualizado);
    }

    @Transactional
    public void eliminar(Long id, String emailOperador) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario con id: " + id));

        validarPosibleDesactivacionOInactivacion(usuario, emailOperador, "eliminar");

        usuarioRepository.delete(usuario);
    }

    private Long validarYResolverCuadrilla(RolUsuario rol, Long cuadrillaId) {
        if (rol == RolUsuario.CAPATAZ_CUADRILLA) {
            if (cuadrillaId != null && !cuadrillaRepository.existsById(cuadrillaId)) {
                throw new RecursoNoEncontradoException("No existe la cuadrilla con id: " + cuadrillaId);
            }
            return cuadrillaId;
        }
        // Para encargado de corralón y mesa de entradas la asignación a una cuadrilla no aplica
        return null;
    }

    private void validarPosibleDesactivacionOInactivacion(Usuario usuario, String emailOperador, String accion) {
        if (emailOperador != null && usuario.getEmail().equalsIgnoreCase(emailOperador)) {
            throw new OperacionNoPermitidaException("No puede " + accion + " su propia cuenta de usuario");
        }

        if (usuario.getRol() == RolUsuario.ENCARGADO_CORRALON
                && usuario.isActivo()
                && usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON) <= 1) {
            throw new OperacionNoPermitidaException("No es posible " + accion + " al único encargado del corralón activo en el sistema");
        }
    }
}
