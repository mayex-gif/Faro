package com.faro.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

/**
 * Un cambio de estado que se hizo en el celular sin señal y llega cuando vuelve la red.
 * El número de operación no va acá: va en la dirección (PUT /api/sincronizacion/cambios-estado/{operacionId}).
 */
public record CambioEstadoSinSenalDTO(

        @NotNull(message = "La orden es obligatoria")
        Long ordenId,

        @NotNull(message = "El estado nuevo es obligatorio")
        Long estadoId,

        // En qué estado estaba la OT en el celular cuando se tocó el botón ("yo la vi en Planificada").
        // Si en el servidor ya está en otro estado, el cambio NO se aplica: es un conflicto.
        // Opcional: si no viene, no se compara.
        Long estadoAnteriorId,

        // Cuándo se hizo en el celular (opcional, ej: "2026-10-26T10:32:00-03:00")
        OffsetDateTime hechoEn
) {}
