package com.faro.backend.config.security;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET = "faro-municipalidad-estacion-general-paz-clave-secreta-jwt-segura-2026-test-32bytes";
    private static final long EXPIRATION_MS = 3600000; // 1 hora

    private JwtService jwtService;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRATION_MS);
        usuario = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "hashClave",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        usuario.setId(1L);
    }

    @Test
    void generarTokenProduceTokenConTresPartes() {
        String token = jwtService.generarToken(usuario);
        assertNotNull(token);
        String[] partes = token.split("\\.");
        assertEquals(3, partes.length, "El token JWT debe componerse de Header, Payload y Signature");
    }

    @Test
    void extraerEmailDevuelveElEmailDelUsuario() {
        String token = jwtService.generarToken(usuario);
        String email = jwtService.extraerEmail(token);
        assertEquals("encargado@generalpaz.gob.ar", email);
    }

    @Test
    void extraerClaimsDevuelveLosDatosPersonalizados() {
        usuario.setCuadrillaId(5L);
        String token = jwtService.generarToken(usuario);
        Claims claims = jwtService.extraerTodosLosClaims(token);

        assertEquals(1, claims.get("id", Integer.class));
        assertEquals("Martín", claims.get("nombre", String.class));
        assertEquals("Gómez", claims.get("apellido", String.class));
        assertEquals("ENCARGADO_CORRALON", claims.get("rol", String.class));
        assertEquals(5, claims.get("cuadrillaId", Integer.class));
    }

    @Test
    void esTokenValidoDevuelveTrueParaUsuarioYTokenCorrecto() {
        String token = jwtService.generarToken(usuario);
        assertTrue(jwtService.esTokenValido(token, "encargado@generalpaz.gob.ar"));
        assertTrue(jwtService.esTokenValido(token));
    }

    @Test
    void esTokenValidoDevuelveFalseParaEmailDiferente() {
        String token = jwtService.generarToken(usuario);
        assertFalse(jwtService.esTokenValido(token, "otro@generalpaz.gob.ar"));
    }

    @Test
    void esTokenValidoDevuelveFalseParaTokenInvalidoOAlterado() {
        String token = jwtService.generarToken(usuario) + "alterado";
        assertFalse(jwtService.esTokenValido(token, "encargado@generalpaz.gob.ar"));
        assertFalse(jwtService.esTokenValido(token));
    }

    @Test
    void tokenConExpiracionCeroODineroPasadoEsInvalido() {
        JwtService servicioExpirado = new JwtService(SECRET, -1000);
        String tokenExpirado = servicioExpirado.generarToken(usuario);

        assertFalse(servicioExpirado.esTokenValido(tokenExpirado, "encargado@generalpaz.gob.ar"));
        assertFalse(servicioExpirado.esTokenValido(tokenExpirado));
    }

    @Test
    void getExpirationMsDevuelveElValorConfigurado() {
        assertEquals(EXPIRATION_MS, jwtService.getExpirationMs());
    }
}
