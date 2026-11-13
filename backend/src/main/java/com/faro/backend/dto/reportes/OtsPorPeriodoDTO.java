package com.faro.backend.dto.reportes;

/**
 * Punto de una serie temporal: cuántas OTs se crearon/cerraron en un período dado.
 * El campo "periodo" es un String con el formato según la granularidad:
 * <ul>
 *   <li>DIA: "2026-10-28"</li>
 *   <li>SEMANA: "2026-W43"</li>
 *   <li>MES: "2026-10"</li>
 * </ul>
 */
public record OtsPorPeriodoDTO(
        String periodo,
        long otsCreadas,
        long otsCerradas
) {
}
