package com.faro.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Clave nueva que escribe quien la restablece. Nunca se devuelve. */
public record CambioClaveRequestDTO(

        @Schema(description = "Clave nueva (mínimo 8 caracteres)")
        @NotBlank(message = "La clave nueva es obligatoria")
        @Size(min = 8, max = 72, message = "La clave tiene que tener entre 8 y 72 caracteres")
        String clave
) {}
