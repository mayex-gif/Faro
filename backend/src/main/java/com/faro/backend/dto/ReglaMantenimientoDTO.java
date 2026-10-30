package com.faro.backend.dto;

import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoFrecuencia;
import com.faro.backend.models.TipoTrabajo;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Datos de una Regla de Mantenimiento Periódico devuelta a la pantalla. */
public record ReglaMantenimientoDTO(
        Long id,
        String titulo,
        String descripcion,
        TipoTrabajo tipoTrabajo,
        PrioridadOrden prioridad,
        Long lugarId,
        String lugarNombre,
        Long cuadrillaId,
        String cuadrillaNombre,
        TipoFrecuencia frecuencia,
        int intervalo,
        Integer diaSemana,
        Integer diaMes,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        LocalDate proximaEjecucion,
        LocalDateTime ultimaGeneracion,
        boolean activa,
        LocalDateTime fechaCreacion
) {
}
