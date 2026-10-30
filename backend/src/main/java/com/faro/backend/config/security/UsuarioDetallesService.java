package com.faro.backend.config.security;

import com.faro.backend.repositories.UsuarioRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Servicio que carga los datos de autenticación del usuario desde la base de datos de FARO.
 */
@Service
public class UsuarioDetallesService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioDetallesService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return usuarioRepository.findByEmailIgnoreCase(email)
                .map(UsuarioDetalles::new)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con correo: " + email));
    }
}
