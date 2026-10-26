package com.faro.backend.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UsuarioDetallesService userDetailsService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtService, userDetailsService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void sinHeaderAuthorization_dejaPasarSinAutenticar() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtService, userDetailsService);
    }

    @Test
    void conHeaderQueNoEmpiezaConBearer_dejaPasarSinAutenticar() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn("Basic dXNlcjpwYXNz");

        filter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtService, userDetailsService);
    }

    @Test
    void conTokenValido_autenticaAlUsuarioEnSecurityContext() throws ServletException, IOException {
        String token = "tokenValido123";
        String email = "encargado@generalpaz.gob.ar";
        UserDetails userDetails = new User(email, "pass", List.of(new SimpleGrantedAuthority("ROLE_ENCARGADO_CORRALON")));

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extraerEmail(token)).thenReturn(email);
        when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);
        when(jwtService.esTokenValido(token, email)).thenReturn(true);

        filter.doFilter(request, response, filterChain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(email, SecurityContextHolder.getContext().getAuthentication().getName());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void conTokenInvalido_noAutenticaYContinuaCadena() throws ServletException, IOException {
        String token = "tokenInvalido";
        String email = "encargado@generalpaz.gob.ar";
        UserDetails userDetails = new User(email, "pass", List.of(new SimpleGrantedAuthority("ROLE_ENCARGADO_CORRALON")));

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extraerEmail(token)).thenReturn(email);
        when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);
        when(jwtService.esTokenValido(token, email)).thenReturn(false);

        filter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void conTokenValidoDeCuentaDesactivada_noAutenticaYContinuaCadena() throws ServletException, IOException {
        String token = "tokenViejoDeCuentaDadaDeBaja";
        String email = "mesa@generalpaz.gob.ar";
        UserDetails cuentaDesactivada = User.withUsername(email)
                .password("clave-hasheada")
                .authorities(new SimpleGrantedAuthority("ROLE_MESA_ENTRADAS"))
                .disabled(true)
                .build();

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extraerEmail(token)).thenReturn(email);
        when(userDetailsService.loadUserByUsername(email)).thenReturn(cuentaDesactivada);

        filter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(jwtService, never()).esTokenValido(anyString(), anyString());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void conExcepcionAlProcesarToken_atrapaErrorYContinuaCadena() throws ServletException, IOException {
        String token = "tokenCorrupto";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extraerEmail(token)).thenThrow(new RuntimeException("Token expirado o firma corrupta"));

        filter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void siYaEstaAutenticado_noSobreescribeAutenticacion() throws ServletException, IOException {
        String token = "tokenValido";
        String email = "encargado@generalpaz.gob.ar";
        UsernamePasswordAuthenticationToken existingAuth = new UsernamePasswordAuthenticationToken("otroUsuario", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(existingAuth);

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.extraerEmail(token)).thenReturn(email);

        filter.doFilter(request, response, filterChain);

        assertEquals("otroUsuario", SecurityContextHolder.getContext().getAuthentication().getName());
        verifyNoInteractions(userDetailsService);
        verify(filterChain).doFilter(request, response);
    }
}