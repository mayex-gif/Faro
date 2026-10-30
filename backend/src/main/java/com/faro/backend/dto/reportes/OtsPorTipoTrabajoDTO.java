package com.faro.backend.dto.reportes;

import com.faro.backend.models.TipoTrabajo;

/**
 * Cantidad de OTs agrupadas por tipo de trabajo (ej: PODA → 8, BACHEO → 5).
 */
public record OtsPorTipoTrabajoDTO(
        TipoTrabajo tipoTrabajo,
        long cantidad
) {
}
