package com.faro.backend.dto;

import com.faro.backend.models.ClasificacionDesvio;
import com.faro.backend.models.TipoTrabajo;

import java.time.LocalDate;

/**
 * Reporte de desvío individual de una Orden de Trabajo generada por mantenimiento.
 * Mide la diferencia entre la fecha planificada y la fecha de ejecución real.
 */
public record DesvioOrdenDTO(
        Long ordenId,
        Long reglaId,
        String reglaTitulo,
        String descripcion,
        TipoTrabajo tipoTrabajo,
        Long lugarId,
        String lugarNombre,
        Long cuadrillaId,
        String cuadrillaNombre,
        String estadoNombre,
        LocalDate fechaPlanificada,
        LocalDate fechaEjecucion,
        long diasDesvio, // positivo = demorada / vencida por X días; negativo = adelantada por X días; 0 = a tiempo
        ClasificacionDesvio clasificacionDesvio
) {
}
