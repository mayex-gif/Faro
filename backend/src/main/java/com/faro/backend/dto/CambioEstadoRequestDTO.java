package com.faro.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Lo que manda la pantalla para cambiar el estado de una OT: a qué estado pasarla.
 * Al FINALIZAR (estado de cierre que no es cancelación), el pop-up de "Finalizar" suma datos opcionales:
 * - lugarFunciona: la casilla "El lugar quedó funcionando". true = el lugar vuelve a "Funciona";
 *   false = queda como está; null = no se mandó (pantallas viejas o la cola sin señal de antes):
 *   se hace lo de siempre (una luminaria vuelve sola a "Funciona").
 * - gastoReal: "¿Cuánto se gastó en total?" (viene cargado con el monto aproximado y se corrige). null = no se informó.
 * - gastoAdicional: el dato VIEJO del pop-up de #74 ("lo que se gastó de más"). Lo siguen mandando las pantallas
 *   que quedaron guardadas en algún celular y las comandas que esperan en el cuaderno sin señal.
 *   Si llega solo, el gasto total es monto aproximado + gasto adicional (ver gastoTotal).
 * En cualquier otro cambio de estado estos datos no van (si vienen, responde 400).
 */
public record CambioEstadoRequestDTO(

        @NotNull(message = "El estado nuevo es obligatorio")
        Long estadoId,

        Boolean lugarFunciona,

        @DecimalMin(value = "0.00", message = "El gasto total no puede ser negativo")
        @Digits(integer = 12, fraction = 2, message = "El gasto total admite hasta 12 enteros y 2 decimales")
        BigDecimal gastoReal,

        @DecimalMin(value = "0.00", message = "El gasto adicional no puede ser negativo")
        @Digits(integer = 12, fraction = 2, message = "El gasto adicional admite hasta 12 enteros y 2 decimales")
        BigDecimal gastoAdicional
) {
    /** Un cambio de estado sin los datos del cierre (pasar a Planificada, a En curso, cancelar...). */
    public CambioEstadoRequestDTO(Long estadoId) {
        this(estadoId, null, null, null);
    }

    /** Lo que manda el pop-up de "Finalizar" de ahora: la casilla y el gasto total. */
    public CambioEstadoRequestDTO(Long estadoId, Boolean lugarFunciona, BigDecimal gastoReal) {
        this(estadoId, lugarFunciona, gastoReal, null);
    }

    /** ¿Vino algún dato de gasto (nuevo o viejo)? */
    public boolean traeGasto() {
        return gastoReal != null || gastoAdicional != null;
    }

    /**
     * Cuánto se gastó en total en esta OT, según lo que llegó:
     * - Si vino gastoReal, es ese.
     * - Si vino solo el gastoAdicional viejo: lo declarado al crear la OT (o 0 si no se declaró) + el adicional.
     *   Ej: declarado $ 20.000 + adicional $ 3.000 = gasto total $ 23.000.
     * - Si no vino ninguno: null (no se informó).
     */
    public BigDecimal gastoTotal(BigDecimal montoAproximado) {
        if (gastoReal != null) {
            return gastoReal;
        }
        if (gastoAdicional == null) {
            return null;
        }
        return (montoAproximado == null ? BigDecimal.ZERO : montoAproximado).add(gastoAdicional);
    }
}
