package com.faro.backend.dto.reportes;

import java.math.BigDecimal;

/**
 * Lo gastado en las OTs finalizadas en un período: el monto aproximado (declarado al crear la OT)
 * y el gasto adicional (declarado al finalizarla: nafta, materiales o repuestos no previstos).
 */
public record MontoPorPeriodoDTO(String periodo, BigDecimal montoAproximado, BigDecimal gastoAdicional) {

    /** Compatibilidad con la serie anterior al gasto adicional. */
    public MontoPorPeriodoDTO(String periodo, BigDecimal montoAproximado) {
        this(periodo, montoAproximado, BigDecimal.ZERO);
    }
}
