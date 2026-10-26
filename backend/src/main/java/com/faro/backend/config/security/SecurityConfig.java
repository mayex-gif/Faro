package com.faro.backend.config.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Configuración de Spring Security para FARO.
 * Establece arquitectura sin estado (stateless) basada en tokens JWT,
 * configurando los endpoints públicos de login y documentación Swagger.
 * Todo lo demás (lugares, órdenes, cuadrillas, estados, perfil) exige haber iniciado sesión:
 * sin token válido responde 401.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @ConditionalOnBean(UsuarioDetallesService.class)
    public AuthenticationProvider authenticationProvider(UsuarioDetallesService usuarioDetallesService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(usuarioDetallesService);
        authProvider.setPasswordEncoder(passwordEncoder);
        // Primero la clave, después si la cuenta está activa. Por defecto Spring hace al revés:
        // avisaría "cuenta desactivada" aunque la clave esté mal (cualquiera sabría que ese email existe).
        // Así, con clave incorrecta → 401; con la clave correcta de una cuenta dada de baja → DisabledException (409).
        authProvider.setPreAuthenticationChecks(cuenta -> { });
        authProvider.setPostAuthenticationChecks(new AccountStatusUserDetailsChecker());
        return authProvider;
    }

    @Bean
    @ConditionalOnBean({JwtService.class, UsuarioDetallesService.class})
    public JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService, UsuarioDetallesService usuarioDetallesService) {
        return new JwtAuthenticationFilter(jwtService, usuarioDetallesService);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    @SuppressWarnings("java:S4502") // API REST stateless basada en tokens JWT Bearer sin cookies de sesion: CSRF no aplica
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Autowired(required = false) JwtAuthenticationFilter jwtAuthFilter,
            @Autowired(required = false) AuthenticationProvider authenticationProvider) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/auth/validar").permitAll()
                        .requestMatchers("/api/auth/perfil").authenticated()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/error").permitAll()
                        // El resto de la API: solo con sesión iniciada (token válido). Sin token → 401.
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> escribirRespuestaNoAutorizada(response))
                        .accessDeniedHandler((request, response, accessDeniedException) -> escribirRespuestaAccesoDenegado(response))
                );

        if (authenticationProvider != null) {
            http.authenticationProvider(authenticationProvider);
        }
        if (jwtAuthFilter != null) {
            http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        }

        return http.build();
    }

    static void escribirRespuestaNoAutorizada(HttpServletResponse response) throws java.io.IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write("""
            {"estado":401,"mensaje":"Acceso no autorizado. Debe iniciar sesión con credenciales válidas.","errores":{}}
            """);
    }

    static void escribirRespuestaAccesoDenegado(HttpServletResponse response) throws java.io.IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.getWriter().write("""
            {"estado":403,"mensaje":"No tiene permisos para realizar esta acción.","errores":{}}
            """);
    }
}