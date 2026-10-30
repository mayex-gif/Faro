package com.faro.backend.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Resultado de la ejecución de autogeneración de Órdenes de Trabajo del motor de mantenimiento.
 */
public record GeneracionOrdenesResultadoDTO(
        LocalDate fechaEjecucion,
        int reglasEvaluadas,
        int ordenesGeneradas,
        List<OrdenTrabajoDTO> ordenes
) {
}
