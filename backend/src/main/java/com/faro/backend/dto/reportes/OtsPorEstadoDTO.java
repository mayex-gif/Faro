package com.faro.backend.dto.reportes;

/**
 * Cantidad de OTs agrupadas por estado (ej: "Pendiente" → 12, "Finalizada" → 35).
 */
public record OtsPorEstadoDTO(
        String estadoNombre,
        String estadoColor,
        long cantidad
) {
}
