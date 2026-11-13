package com.faro.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Lo que manda la pantalla para cambiar el estado de una OT: a qué estado pasarla.
 * Al FINALIZAR (estado de cierre que no es cancelación), el pop-up de "Finalizar" suma dos datos opcionales:
 * - lugarFunciona: la casilla "El lugar quedó funcionando". true = el lugar vuelve a "Funciona";
 *   false = queda como está; null = no se mandó (pantallas viejas o la cola sin señal de antes):
 *   se hace lo de siempre (una luminaria vuelve sola a "Funciona").
 * - gastoAdicional: lo que se gastó de más y no estaba en el monto aproximado (ej: nafta). null = no se declaró.
 * En cualquier otro cambio de estado estos dos datos no van (si vienen, responde 400).
 */
public record CambioEstadoRequestDTO(

        @NotNull(message = "El estado nuevo es obligatorio")
        Long estadoId,

        Boolean lugarFunciona,

        @DecimalMin(value = "0.00", message = "El gasto adicional no puede ser negativo")
        @Digits(integer = 12, fraction = 2, message = "El gasto adicional admite hasta 12 enteros y 2 decimales")
        BigDecimal gastoAdicional
) {
    /** Un cambio de estado sin los datos del cierre (pasar a Planificada, a En curso, cancelar...). */
    public CambioEstadoRequestDTO(Long estadoId) {
        this(estadoId, null, null);
    }
}
