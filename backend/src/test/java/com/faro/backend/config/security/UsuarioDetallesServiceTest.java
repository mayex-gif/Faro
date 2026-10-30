package com.faro.backend.config.security;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioDetallesServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    private UsuarioDetallesService service;

    @BeforeEach
    void setUp() {
        service = new UsuarioDetallesService(usuarioRepository);
    }

    @Test
    void loadUserByUsernameConUsuarioExistente_retornaUserDetails() {
        Usuario usuario = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "pass123",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(usuario));

        UserDetails details = service.loadUserByUsername("encargado@generalpaz.gob.ar");

        assertNotNull(details);
        assertEquals("encargado@generalpaz.gob.ar", details.getUsername());
        assertEquals("pass123", details.getPassword());
    }

    @Test
    void loadUserByUsernameConUsuarioInexistente_lanzaUsernameNotFoundException() {
        when(usuarioRepository.findByEmailIgnoreCase("noexiste@generalpaz.gob.ar")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("noexiste@generalpaz.gob.ar"));
    }
}
