package com.faro.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

/**
 * Una OT que se cargó sin señal y llega cuando vuelve la red.
 * "orden" son los mismos datos que el alta normal (y con las mismas validaciones, por el @Valid).
 */
public record AltaOrdenSinSenalDTO(

        @NotNull(message = "Faltan los datos de la orden")
        @Valid
        OrdenTrabajoRequestDTO orden,

        // Cuándo se cargó en el celular (opcional)
        OffsetDateTime hechoEn
) {}
