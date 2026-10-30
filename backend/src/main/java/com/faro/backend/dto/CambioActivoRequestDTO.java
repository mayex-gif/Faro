package com.faro.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Dar de baja (activo = false) o reactivar (activo = true) a una persona. */
public record CambioActivoRequestDTO(

        @Schema(description = "false = dar de baja; true = reactivar", example = "false")
        @NotNull(message = "Hay que indicar si la cuenta queda activa o no")
        Boolean activo
) {}
