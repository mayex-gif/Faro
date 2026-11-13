package com.faro.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
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
        OffsetDateTime hechoEn,

        // Los datos del pop-up de "Finalizar" (opcionales, iguales a los de CambioEstadoRequestDTO).
        // Las comandas que quedaron en la cola antes de este cambio no los traen: llegan como null.
        Boolean lugarFunciona,

        @DecimalMin(value = "0.00", message = "El gasto adicional no puede ser negativo")
        @Digits(integer = 12, fraction = 2, message = "El gasto adicional admite hasta 12 enteros y 2 decimales")
        BigDecimal gastoAdicional
) {
    /** Un cambio de estado sin los datos del cierre (como llegaban antes del pop-up de "Finalizar"). */
    public CambioEstadoSinSenalDTO(Long ordenId, Long estadoId, Long estadoAnteriorId, OffsetDateTime hechoEn) {
        this(ordenId, estadoId, estadoAnteriorId, hechoEn, null, null);
    }

    /** El pedido de siempre, con los datos del cierre (lo que recibe OrdenTrabajoService). */
    public CambioEstadoRequestDTO comoPedido() {
        return new CambioEstadoRequestDTO(estadoId, lugarFunciona, gastoAdicional);
    }
}
