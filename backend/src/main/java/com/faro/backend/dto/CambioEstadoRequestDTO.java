package com.faro.backend.dto;

import jakarta.validation.constraints.NotNull;

/** Lo que manda la pantalla para cambiar el estado de una OT: a qué estado pasarla. */
public record CambioEstadoRequestDTO(

        @NotNull(message = "El estado nuevo es obligatorio")
        Long estadoId
) {}