package com.faro.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Respuesta de autenticación exitosa con token JWT y datos de perfil")
public record LoginResponseDTO(
        @Schema(description = "Token de autenticación JWT (JSON Web Token)", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        String token,

        @Schema(description = "Esquema de autenticación HTTP", example = "Bearer")
        String tipoToken,

        @Schema(description = "Tiempo de validez en milisegundos a partir de la emisión", example = "86400000")
        long expiraEn,

        @Schema(description = "Información del usuario autenticado")
        UsuarioDTO usuario
) {
    public LoginResponseDTO(String token, long expiraEn, UsuarioDTO usuario) {
        this(token, "Bearer", expiraEn, usuario);
    }
}
