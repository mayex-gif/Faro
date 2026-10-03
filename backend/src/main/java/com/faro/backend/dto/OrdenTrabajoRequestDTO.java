package com.faro.backend.dto;

import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Datos que manda la pantalla para crear o modificar una Orden de Trabajo. */
public record OrdenTrabajoRequestDTO(

        @NotBlank(message = "La descripción es obligatoria")
        @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
        String descripcion,

        @NotNull(message = "El tipo de trabajo es obligatorio")
        TipoTrabajo tipo,

        @NotNull(message = "El origen es obligatorio")
        OrigenOrden origen,

        @NotNull(message = "La prioridad es obligatoria")
        PrioridadOrden prioridad,

        @NotNull(message = "El lugar es obligatorio")
        Long lugarId
) {}