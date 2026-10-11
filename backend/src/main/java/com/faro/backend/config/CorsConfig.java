package com.faro.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS: qué páginas web (orígenes) pueden llamar a la API desde el navegador.
 * La lista sale de la property faro.cors.origenes (variable FARO_CORS_ORIGENES),
 * separada por comas. Si no se define, se permite solo el frontend local (http://localhost:5173).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] origenesPermitidos;

    // Spring convierte "http://a.com,http://b.com" en un arreglo de dos elementos
    public CorsConfig(@Value("${faro.cors.origenes}") String[] origenesPermitidos) {
        this.origenesPermitidos = origenesPermitidos;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Aplica a todos los endpoints de la API
                .allowedOrigins(origenesPermitidos)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}