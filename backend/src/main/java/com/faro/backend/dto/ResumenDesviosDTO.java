package com.faro.backend.dto;

import java.util.List;

/**
 * Resumen consolidado del cumplimiento y desvíos (planificado vs ejecutado)
 * para una regla en particular o para todo el municipio.
 */
public record ResumenDesviosDTO(
        Long reglaId,
        String reglaTitulo,
        long totalGeneradas,
        long finalizadasATiempo,
        long finalizadasAdelantadas,
        long finalizadasDemoradas,
        long pendientesEnPlazo,
        long pendientesVencidas,
        long canceladas,
        double desvioPromedioDias,
        double porcentajeCumplimiento, // % de órdenes finalizadas en término o adelantadas sobre el total finalizado
        List<DesvioOrdenDTO> ordenes
) {
}
