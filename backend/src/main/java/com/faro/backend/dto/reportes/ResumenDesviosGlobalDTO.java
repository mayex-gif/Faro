package com.faro.backend.dto.reportes;

/**
 * KPIs de desvíos de ejecución vs planificación para OTs del plan de mantenimiento.
 * Reutiliza la lógica de clasificación de ClasificacionDesvio.
 */
public record ResumenDesviosGlobalDTO(
        long totalConPlanificacion,
        long aTiempo,
        long adelantadas,
        long demoradas,
        long pendientesEnPlazo,
        long pendientesVencidas,
        long canceladas,
        double porcentajeCumplimiento,  // % (a tiempo + adelantadas) / total finalizadas
        double desvioPromedioDias       // promedio de días de desvío (solo finalizadas; negativo = adelanto)
) {
}
