package com.faro.backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Configuración de Swagger (springdoc) para que se pueda usar con login.
 *
 * - @SecurityScheme le explica a Swagger cómo viaja el token: en la cabecera
 *   "Authorization: Bearer <token>" (tipo HTTP bearer, formato JWT).
 *   Con eso aparece el botón "Authorize" arriba a la derecha.
 * - @OpenAPIDefinition(security = ...) dice que TODOS los endpoints usan ese token.
 *   Después de tocar "Authorize" y pegar el token, Swagger lo manda solo en cada "Execute".
 *
 * El login (/api/auth/login) también muestra el candado, pero funciona sin token.
 */
@Configuration
@OpenAPIDefinition(security = @SecurityRequirement(name = OpenApiConfig.ESQUEMA_TOKEN))
@SecurityScheme(
        name = OpenApiConfig.ESQUEMA_TOKEN,
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Pegá acá el token que devuelve POST /api/auth/login (solo el token, sin la palabra Bearer)."
)
public class OpenApiConfig {

    /** Nombre interno del esquema de seguridad (lo usan las dos anotaciones de arriba). */
    public static final String ESQUEMA_TOKEN = "tokenJwt";
}