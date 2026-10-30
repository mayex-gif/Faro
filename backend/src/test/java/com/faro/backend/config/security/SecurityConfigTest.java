package com.faro.backend.config.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private UsuarioDetallesService usuarioDetallesService;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationConfiguration authConfig;

    @Mock
    private AuthenticationManager authManager;

    @Test
    void passwordEncoderDevuelveBCrypt() {
        SecurityConfig config = new SecurityConfig();
        PasswordEncoder encoder = config.passwordEncoder();
        assertNotNull(encoder);
        assertTrue(encoder.matches("test", encoder.encode("test")));
    }

    @Test
    void authenticationProviderConfiguraDaoAuthenticationProvider() {
        SecurityConfig config = new SecurityConfig();
        PasswordEncoder encoder = config.passwordEncoder();
        AuthenticationProvider provider = config.authenticationProvider(usuarioDetallesService, encoder);
        assertNotNull(provider);
    }

    @Test
    void jwtAuthenticationFilterCreaInstancia() {
        SecurityConfig config = new SecurityConfig();
        JwtAuthenticationFilter filter = config.jwtAuthenticationFilter(jwtService, usuarioDetallesService);
        assertNotNull(filter);
    }

    @Test
    void authenticationManagerDelegaEnConfig() throws Exception {
        when(authConfig.getAuthenticationManager()).thenReturn(authManager);
        SecurityConfig config = new SecurityConfig();
        AuthenticationManager result = config.authenticationManager(authConfig);
        assertSame(authManager, result);
    }

    @Test
    void escribirRespuestaNoAutorizadaEscribeJson401() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        SecurityConfig.escribirRespuestaNoAutorizada(response);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentType().contains("application/json"));
        assertTrue(response.getContentAsString().contains("\"estado\":401"));
    }

    @Test
    void escribirRespuestaAccesoDenegadoEscribeJson403() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        SecurityConfig.escribirRespuestaAccesoDenegado(response);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentType().contains("application/json"));
        assertTrue(response.getContentAsString().contains("\"estado\":403"));
    }
}
