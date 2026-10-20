package com.faro.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Datos requeridos para iniciar sesión en FARO")
public record LoginRequestDTO(
        @Schema(description = "Correo electrónico institucional", example = "encargado@generalpaz.gob.ar")
        @NotBlank(message = "El correo electrónico es obligatorio")
        @Email(message = "El formato del correo electrónico no es válido")
        String email,

        @Schema(description = "Contraseña de acceso", example = "Faro2026!")
        @NotBlank(message = "La contraseña es obligatoria")
        String password
) {}
