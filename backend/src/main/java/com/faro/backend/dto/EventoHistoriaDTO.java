package com.faro.backend.dto;

import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;

import java.time.LocalDateTime;

/**
 * Un renglón de la línea de tiempo de un lugar, listo para que la pantalla lo dibuje.
 * tipo puede ser:
 *  - "ORDEN_CREADA":       se registró una OT en el lugar (sale de la fechaCreacion de la OT)
 *  - "CAMBIO_ESTADO":      una OT pasó de un estado a otro (sale de la bitácora)
 *  - "CUADRILLA_ASIGNADA": a una OT se le asignó una cuadrilla (sale de la bitácora)
 * Los campos que no corresponden a ese tipo de evento vienen en null.
 */
public record EventoHistoriaDTO(
        LocalDateTime fecha,
        String tipo,
        Long ordenId,
        String ordenDescripcion,
        TipoTrabajo tipoTrabajo,
        OrigenOrden origen,           // solo en ORDEN_CREADA
        PrioridadOrden prioridad,     // solo en ORDEN_CREADA
        String estadoAnterior,        // "Pendiente"
        String estadoNuevo,           // "En curso"
        String estadoNuevoColor,      // "#9A4A12", para pintar el punto de la línea de tiempo
        boolean cierre,               // true si la OT pasó a un estado final (Finalizada, Cancelada)
        String cuadrilla              // solo en CUADRILLA_ASIGNADA: "Cuadrilla Verde"
) {}