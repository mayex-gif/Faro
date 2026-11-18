package com.faro.backend.dto.reportes;

import java.math.BigDecimal;

/**
 * Un grupo de luminarias instaladas para la sección "Luminarias" de Reportes: las nuevas, las viejas o las sin marcar.
 *
 * <p>clave: "nueva", "vieja" o "sinMarcar" (el campo {@code nueva} del lugar en true, false o null).</p>
 * <p>cantidad, funcionan, apagadas, enArreglo: cómo están HOY (no dependen del período).
 * "En arreglo" = no funciona y tiene alguna OT abierta (la misma regla que el mapa); "apagada" = no funciona y no tiene.</p>
 * <p>otsDelPeriodo: OT creadas en el período sobre luminarias de este grupo ("fallas").
 * gastoDelPeriodo: lo gastado en las OT finalizadas en el período (sin gasto real, cuenta lo declarado; como el resto de Reportes).</p>
 */
public record GrupoLuminariasDTO(
        String clave,
        long cantidad,
        long funcionan,
        long apagadas,
        long enArreglo,
        long otsDelPeriodo,
        BigDecimal gastoDelPeriodo
) {
    /** Un grupo sin luminarias (todo en cero). */
    public static GrupoLuminariasDTO vacio(String clave) {
        return new GrupoLuminariasDTO(clave, 0, 0, 0, 0, 0, BigDecimal.ZERO);
    }
}
