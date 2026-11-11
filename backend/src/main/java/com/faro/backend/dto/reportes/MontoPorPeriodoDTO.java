package com.faro.backend.dto.reportes;

import java.math.BigDecimal;

/** Monto aproximado acumulado de las OTs creadas en un período. */
public record MontoPorPeriodoDTO(String periodo, BigDecimal montoAproximado) {
}
