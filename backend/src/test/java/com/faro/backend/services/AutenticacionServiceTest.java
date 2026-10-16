package com.faro.backend.services;

import com.faro.backend.config.security.JwtService;
import com.faro.backend.config.security.UsuarioDetalles;
import com.faro.backend.dto.LoginRequestDTO;
import com.faro.backend.dto.LoginResponseDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AutenticacionServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private AutenticacionService autenticacionService;

    private Usuario usuarioActivo;

    @BeforeEach
    void setUp() {
        usuarioActivo = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "encodedPass",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        usuarioActivo.setId(1L);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void autenticarConCredencialesValidasDevuelveTokenYDatos() {
        LoginRequestDTO request = new LoginRequestDTO("encargado@generalpaz.gob.ar", "Faro2026!");

        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(usuarioActivo));
        when(jwtService.generarToken(usuarioActivo)).thenReturn("token.jwt.valido");
        when(jwtService.getExpirationMs()).thenReturn(86400000L);

        LoginResponseDTO respuesta = autenticacionService.autenticar(request);

        assertNotNull(respuesta);
        assertEquals("token.jwt.valido", respuesta.token());
        assertEquals("Bearer", respuesta.tipoToken());
        assertEquals(86400000L, respuesta.expiraEn());
        assertEquals(1L, respuesta.usuario().id());
        assertEquals("encargado@generalpaz.gob.ar", respuesta.usuario().email());

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void autenticarConCredencialesIncorrectasLanzaBadCredentialsException() {
        LoginRequestDTO request = new LoginRequestDTO("encargado@generalpaz.gob.ar", "claveErronea");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        BadCredentialsException exception = assertThrows(BadCredentialsException.class,
                () -> autenticacionService.autenticar(request));

        assertEquals("Correo o contraseña incorrectos", exception.getMessage());
        verify(usuarioRepository, never()).findByEmailIgnoreCase(any());
    }

    @Test
    void autenticarUsuarioInactivoLanzaOperacionNoPermitidaException() {
        Usuario usuarioInactivo = new Usuario("Carlos", "Rodríguez", "capataz.verde@generalpaz.gob.ar", "encodedPass",
                RolUsuario.CAPATAZ_CUADRILLA, 1L, false);
        LoginRequestDTO request = new LoginRequestDTO("capataz.verde@generalpaz.gob.ar", "Faro2026!");

        when(usuarioRepository.findByEmailIgnoreCase("capataz.verde@generalpaz.gob.ar")).thenReturn(Optional.of(usuarioInactivo));

        OperacionNoPermitidaException exception = assertThrows(OperacionNoPermitidaException.class,
                () -> autenticacionService.autenticar(request));

        assertTrue(exception.getMessage().contains("desactivada"));
        verify(jwtService, never()).generarToken(any());
    }

    @Test
    void autenticarUsuarioNoExistenteLanzaRecursoNoEncontrado() {
        LoginRequestDTO request = new LoginRequestDTO("inexistente@generalpaz.gob.ar", "Faro2026!");

        when(usuarioRepository.findByEmailIgnoreCase("inexistente@generalpaz.gob.ar")).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class,
                () -> autenticacionService.autenticar(request));
    }

    @Test
    void obtenerPerfilActualConSesionValidaDevuelveUsuarioDTO() {
        UsuarioDetalles detalles = new UsuarioDetalles(usuarioActivo);
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(detalles);

        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(context);

        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(usuarioActivo));

        UsuarioDTO perfil = autenticacionService.obtenerPerfilActual();

        assertNotNull(perfil);
        assertEquals("Martín", perfil.nombre());
        assertEquals("encargado@generalpaz.gob.ar", perfil.email());
        assertEquals(RolUsuario.ENCARGADO_CORRALON, perfil.rol());
    }

    @Test
    void obtenerPerfilActualSinSesionLanzaBadCredentialsException() {
        SecurityContextHolder.clearContext();

        assertThrows(BadCredentialsException.class, () -> autenticacionService.obtenerPerfilActual());
    }

    @Test
    void validarTokenConBearerValidoDevuelveUsuario() {
        when(jwtService.esTokenValido("tokenValido")).thenReturn(true);
        when(jwtService.extraerEmail("tokenValido")).thenReturn("encargado@generalpaz.gob.ar");
        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(usuarioActivo));

        UsuarioDTO resultado = autenticacionService.validarToken("Bearer tokenValido");

        assertNotNull(resultado);
        assertEquals(1L, resultado.id());
        assertEquals("encargado@generalpaz.gob.ar", resultado.email());
    }

    @Test
    void validarTokenConFormatoInvalidoLanzaBadCredentialsException() {
        assertThrows(BadCredentialsException.class, () -> autenticacionService.validarToken("NoBearer"));
        assertThrows(BadCredentialsException.class, () -> autenticacionService.validarToken(null));
    }

    @Test
    void validarTokenConTokenExpiradoOInvalidoLanzaBadCredentialsException() {
        when(jwtService.esTokenValido("tokenExpirado")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> autenticacionService.validarToken("Bearer tokenExpirado"));
    }

    @Test
    void validarTokenConUsuarioInactivoLanzaOperacionNoPermitidaException() {
        usuarioActivo.setActivo(false);
        when(jwtService.esTokenValido("tokenValido")).thenReturn(true);
        when(jwtService.extraerEmail("tokenValido")).thenReturn("encargado@generalpaz.gob.ar");
        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(usuarioActivo));

        assertThrows(OperacionNoPermitidaException.class, () -> autenticacionService.validarToken("Bearer tokenValido"));
    }
}
