package com.faro.backend.config.security;

import com.faro.backend.models.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

/**
 * Servicio encargado de la generación, firma criptográfica y validación de tokens JWT.
 */
@Service
public class JwtService {

    private final String secretKeyString;
    private final long expirationMs;

    public JwtService(
            @Value("${faro.jwt.secret:faro-municipalidad-estacion-general-paz-clave-secreta-jwt-segura-2026}") String secretKeyString,
            @Value("${faro.jwt.expiration-ms:86400000}") long expirationMs) {
        this.secretKeyString = secretKeyString;
        this.expirationMs = expirationMs;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKeyString.getBytes(StandardCharsets.UTF_8));
    }

    public String generarToken(Usuario usuario) {
        Date ahora = new Date();
        Date fechaExpiracion = new Date(ahora.getTime() + expirationMs);

        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("id", usuario.getId())
                .claim("nombre", usuario.getNombre())
                .claim("apellido", usuario.getApellido())
                .claim("rol", usuario.getRol().name())
                .claim("cuadrillaId", usuario.getCuadrillaId())
                .issuedAt(ahora)
                .expiration(fechaExpiracion)
                .signWith(getSigningKey())
                .compact();
    }

    public String extraerEmail(String token) {
        return extraerClaim(token, Claims::getSubject);
    }

    public <T> T extraerClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = extraerTodosLosClaims(token);
        return claimsResolver.apply(claims);
    }

    public Claims extraerTodosLosClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean esTokenValido(String token, String emailEsperado) {
        try {
            String email = extraerEmail(token);
            return (email.equalsIgnoreCase(emailEsperado) && !estaExpirado(token));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean esTokenValido(String token) {
        try {
            extraerTodosLosClaims(token);
            return !estaExpirado(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private boolean estaExpirado(String token) {
        Date expiracion = extraerClaim(token, Claims::getExpiration);
        return expiracion.before(new Date());
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
