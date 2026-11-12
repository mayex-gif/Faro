package com.faro.backend.dto;

import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import org.locationtech.jts.geom.Geometry;

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
        String cuadrillaNombre, // null mientras no tenga cuadrilla asignada
        LocalDate fechaPlanificada,
        LocalDateTime fechaFinalizacion,
        Long reglaMantenimientoId,
        String calleEntre1,
        String calleEntre2,
        String altura,
        BigDecimal montoAproximado,
        Geometry tramo        // null = toda la calle (o el lugar no es una calle)
) {
    /** Constructor de conveniencia para casos donde no hay cuadrilla asignada */
    public OrdenTrabajoDTO(Long id, String descripcion, TipoTrabajo tipo, OrigenOrden origen,
                           PrioridadOrden prioridad, Long lugarId, String lugarNombre,
                           LocalDateTime fechaCreacion, Long estadoId, String estadoNombre,
                           String estadoColor) {
        this(id, descripcion, tipo, origen, prioridad, lugarId, lugarNombre, fechaCreacion,
                estadoId, estadoNombre, estadoColor, null, null, null, null, null, null, null, null, null, null);
    }

    /** Constructor de compatibilidad con 13 parámetros (usado previamente) */
    public OrdenTrabajoDTO(Long id, String descripcion, TipoTrabajo tipo, OrigenOrden origen,
                           PrioridadOrden prioridad, Long lugarId, String lugarNombre,
                           LocalDateTime fechaCreacion, Long estadoId, String estadoNombre,
                           String estadoColor, Long cuadrillaId, String cuadrillaNombre) {
        this(id, descripcion, tipo, origen, prioridad, lugarId, lugarNombre, fechaCreacion,
                estadoId, estadoNombre, estadoColor, cuadrillaId, cuadrillaNombre, null, null, null, null, null, null, null, null);
    }

    /** Compatibilidad con el constructor canónico anterior a los campos de ubicación vial y gasto. */
    public OrdenTrabajoDTO(Long id, String descripcion, TipoTrabajo tipo, OrigenOrden origen,
                           PrioridadOrden prioridad, Long lugarId, String lugarNombre,
                           LocalDateTime fechaCreacion, Long estadoId, String estadoNombre,
                           String estadoColor, Long cuadrillaId, String cuadrillaNombre,
                           LocalDate fechaPlanificada, LocalDateTime fechaFinalizacion,
                           Long reglaMantenimientoId) {
        this(id, descripcion, tipo, origen, prioridad, lugarId, lugarNombre, fechaCreacion,
                estadoId, estadoNombre, estadoColor, cuadrillaId, cuadrillaNombre,
                fechaPlanificada, fechaFinalizacion, reglaMantenimientoId, null, null, null, null, null);
    }

    /** Compatibilidad con el constructor canónico anterior al tramo de calle (OT de toda la calle). */
    public OrdenTrabajoDTO(Long id, String descripcion, TipoTrabajo tipo, OrigenOrden origen,
                           PrioridadOrden prioridad, Long lugarId, String lugarNombre,
                           LocalDateTime fechaCreacion, Long estadoId, String estadoNombre,
                           String estadoColor, Long cuadrillaId, String cuadrillaNombre,
                           LocalDate fechaPlanificada, LocalDateTime fechaFinalizacion,
                           Long reglaMantenimientoId, String calleEntre1, String calleEntre2,
                           String altura, BigDecimal montoAproximado) {
        this(id, descripcion, tipo, origen, prioridad, lugarId, lugarNombre, fechaCreacion,
                estadoId, estadoNombre, estadoColor, cuadrillaId, cuadrillaNombre,
                fechaPlanificada, fechaFinalizacion, reglaMantenimientoId,
                calleEntre1, calleEntre2, altura, montoAproximado, null);
    }
}
