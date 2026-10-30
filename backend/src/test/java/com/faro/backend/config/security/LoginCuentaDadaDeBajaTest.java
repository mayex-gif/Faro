package com.faro.backend.config.security;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * El login de una cuenta dada de baja, con el AuthenticationProvider real de SecurityConfig:
 * primero se revisa la clave y después si la cuenta está activa.
 */
class LoginCuentaDadaDeBajaTest {

    private static final String EMAIL = "mesadeentradas@generalpaz.gob.ar";
    private static final String CLAVE = "clave-de-prueba";

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private final UsuarioDetallesService usuarioDetallesService = mock(UsuarioDetallesService.class);
    private AuthenticationProvider provider;

    @BeforeEach
    void setUp() {
        provider = new SecurityConfig().authenticationProvider(usuarioDetallesService, encoder);
    }

    private void existeLaCuenta(boolean activa) {
        when(usuarioDetallesService.loadUserByUsername(EMAIL)).thenReturn(new UsuarioDetalles(
                new Usuario("Ana", "Martínez", EMAIL, encoder.encode(CLAVE), RolUsuario.MESA_ENTRADAS, null, activa)));
    }

    @Test
    void cuentaDadaDeBajaConLaClaveCorrectaAvisaQueEstaDesactivada() {
        existeLaCuenta(false);

        assertThrows(DisabledException.class,
                () -> provider.authenticate(new UsernamePasswordAuthenticationToken(EMAIL, CLAVE)));
    }

    @Test
    void cuentaDadaDeBajaConClaveIncorrectaNoRevelaQueExiste() {
        existeLaCuenta(false);

        assertThrows(BadCredentialsException.class,
                () -> provider.authenticate(new UsernamePasswordAuthenticationToken(EMAIL, "otra-clave")));
    }

    @Test
    void cuentaActivaConLaClaveCorrectaEntra() {
        existeLaCuenta(true);

        assertTrue(provider.authenticate(new UsernamePasswordAuthenticationToken(EMAIL, CLAVE)).isAuthenticated());
    }
}
