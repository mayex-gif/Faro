package com.faro.backend.services;

import com.faro.backend.config.security.JwtService;
import com.faro.backend.config.security.UsuarioDetalles;
import com.faro.backend.dto.LoginRequestDTO;
import com.faro.backend.dto.LoginResponseDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.UsuarioRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de negocio para la autenticación de usuarios, emisión de tokens y consulta de perfil.
 */
@Service
public class AutenticacionService {

    static final String CUENTA_DESACTIVADA = "La cuenta de usuario se encuentra desactivada. Contacte a la administración.";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public AutenticacionService(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UsuarioRepository usuarioRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public LoginResponseDTO autenticar(LoginRequestDTO request) {
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password())
            );
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Correo o contraseña incorrectos");
        } catch (DisabledException e) {
            // Clave correcta, pero la cuenta está dada de baja (ver SecurityConfig.authenticationProvider)
            throw new OperacionNoPermitidaException(CUENTA_DESACTIVADA);
        }

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con correo: " + email));

        if (!usuario.isActivo()) {
            throw new OperacionNoPermitidaException(CUENTA_DESACTIVADA);
        }

        String token = jwtService.generarToken(usuario);
        return new LoginResponseDTO(
                token,
                jwtService.getExpirationMs(),
                UsuarioDTO.desdeEntidad(usuario)
        );
    }

    @Transactional(readOnly = true)
    public UsuarioDTO obtenerPerfilActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BadCredentialsException("No hay una sesión autenticada activa");
        }

        String email;
        if (auth.getPrincipal() instanceof UsuarioDetalles detalles) {
            email = detalles.getUsername();
        } else {
            email = auth.getName();
        }

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario del perfil actual: " + email));

        return UsuarioDTO.desdeEntidad(usuario);
    }

    @Transactional(readOnly = true)
    public UsuarioDTO validarToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BadCredentialsException("Encabezado de autorización ausente o inválido");
        }
        String token = authHeader.substring(7).trim();
        if (!jwtService.esTokenValido(token)) {
            throw new BadCredentialsException("El token proporcionado no es válido o ha expirado");
        }
        String email = jwtService.extraerEmail(token);
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario del token no encontrado"));

        if (!usuario.isActivo()) {
            throw new OperacionNoPermitidaException("La cuenta de usuario se encuentra desactivada");
        }

        return UsuarioDTO.desdeEntidad(usuario);
    }
}
