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
        LocalDateTime fechaCreacion
) {}