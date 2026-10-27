package com.faro.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Petición para activar o desactivar la cuenta de un usuario (baja lógica)")
public record CambiarActivoUsuarioRequestDTO(
        @NotNull(message = "El estado activo es obligatorio")
        @Schema(description = "true para habilitar el usuario, false para deshabilitarlo", example = "false")
        Boolean activo
) {
}
