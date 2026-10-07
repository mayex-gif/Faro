package com.faro.backend.dto;

import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;

import java.time.LocalDateTime;

/** Datos de una Orden de Trabajo que el backend le devuelve a la pantalla. */
public record OrdenTrabajoDTO(
        Long id,
        String descripcion,
        TipoTrabajo tipo,
        OrigenOrden origen,
        PrioridadOrden prioridad,
        Long lugarId,
        String lugarNombre,   // así la pantalla puede mostrar "Plaza San Martín" sin otro pedido
        LocalDateTime fechaCreacion,
        Long estadoId,
        String estadoNombre,  // "En curso"
        String estadoColor,   // "#9A4A12", para pintarlo en la pantalla
        Long cuadrillaId,     // null mientras no tenga cuadrilla asignada
        String cuadrillaNombre // null mientras no tenga cuadrilla asignada
) {
    /** Constructor de conveniencia para casos donde no hay cuadrilla asignada */
    public OrdenTrabajoDTO(Long id, String descripcion, TipoTrabajo tipo, OrigenOrden origen,
                           PrioridadOrden prioridad, Long lugarId, String lugarNombre,
                           LocalDateTime fechaCreacion, Long estadoId, String estadoNombre,
                           String estadoColor) {
        this(id, descripcion, tipo, origen, prioridad, lugarId, lugarNombre, fechaCreacion,
                estadoId, estadoNombre, estadoColor, null, null);
    }
}