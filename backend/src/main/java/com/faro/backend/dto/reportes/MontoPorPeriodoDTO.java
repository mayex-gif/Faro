package com.faro.backend.dto.reportes;

import java.math.BigDecimal;

/**
 * Lo gastado en las OTs finalizadas en un período, para el gráfico "Monto gastado" (dos barras, una al lado de la otra):
 * - montoAproximado: lo declarado al crear las OT.
 * - gastoReal: lo que se gastó en total ("¿Cuánto se gastó en total?" al finalizarlas; si una OT no lo tiene,
 *   cuenta lo declarado).
 * - diferencia: gastoReal − montoAproximado. Negativa = se gastó menos de lo declarado.
 */
public record MontoPorPeriodoDTO(String periodo, BigDecimal montoAproximado, BigDecimal gastoReal, BigDecimal diferencia) {

    /** Arma el período a partir de lo declarado y lo gastado (la diferencia la calcula FARO). */
    public static MontoPorPeriodoDTO de(String periodo, BigDecimal montoAproximado, BigDecimal gastoReal) {
        return new MontoPorPeriodoDTO(periodo, montoAproximado, gastoReal, gastoReal.subtract(montoAproximado));
    }

    /** Compatibilidad con la serie anterior al gasto real: sin el dato, se gastó lo declarado. */
    public MontoPorPeriodoDTO(String periodo, BigDecimal montoAproximado) {
        this(periodo, montoAproximado, montoAproximado, BigDecimal.ZERO);
    }
}
