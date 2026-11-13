package com.faro.backend.dto;

import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Un renglón de la línea de tiempo de un lugar, listo para que la pantalla lo dibuje.
 * tipo puede ser:
 *  - "ORDEN_CREADA":       se registró una OT en el lugar (sale de la fechaCreacion de la OT)
 *  - "CAMBIO_ESTADO":      una OT pasó de un estado a otro (sale de la bitácora)
 *  - "CUADRILLA_ASIGNADA": a una OT se le asignó una cuadrilla (sale de la bitácora)
 *  - "CUADRILLA_REASIGNADA": una OT pasó de una cuadrilla a otra (sale de la bitácora)
 * Al finalizar una OT, el CAMBIO_ESTADO trae también el gasto adicional y si el lugar volvió a funcionar.
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
        String cuadrilla,             // en CUADRILLA_ASIGNADA y CUADRILLA_REASIGNADA: la que quedó a cargo
        String cuadrillaAnterior,     // solo en CUADRILLA_REASIGNADA: la que la tenía antes
        BigDecimal gastoAdicional,    // solo al finalizar: lo que se gastó de más (null = no se declaró)
        Boolean lugarFunciona         // solo al finalizar: true = volvió a funcionar, false = sigue fuera de servicio
) {
    /** Compatibilidad con el renglón anterior al pop-up de "Finalizar" (sin gasto ni estado del lugar). */
    public EventoHistoriaDTO(LocalDateTime fecha, String tipo, Long ordenId, String ordenDescripcion,
                             TipoTrabajo tipoTrabajo, OrigenOrden origen, PrioridadOrden prioridad,
                             String estadoAnterior, String estadoNuevo, String estadoNuevoColor, boolean cierre,
                             String cuadrilla, String cuadrillaAnterior) {
        this(fecha, tipo, ordenId, ordenDescripcion, tipoTrabajo, origen, prioridad, estadoAnterior, estadoNuevo,
                estadoNuevoColor, cierre, cuadrilla, cuadrillaAnterior, null, null);
    }
}