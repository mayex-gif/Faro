package com.faro.backend.dto;

import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoFrecuencia;
import com.faro.backend.models.TipoTrabajo;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Datos para crear o actualizar una regla de mantenimiento periódico. */
public record ReglaMantenimientoRequestDTO(
        @NotBlank(message = "El título es obligatorio")
        @Size(max = 150, message = "El título no puede superar los 150 caracteres")
        String titulo,

        @NotBlank(message = "La descripción es obligatoria")
        @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
        String descripcion,

        @NotNull(message = "El tipo de trabajo es obligatorio")
        TipoTrabajo tipoTrabajo,

        @NotNull(message = "La prioridad es obligatoria")
        PrioridadOrden prioridad,

        @NotNull(message = "El lugar es obligatorio")
        Long lugarId,

        Long cuadrillaId, // opcional: si se desea preasignar a una cuadrilla

        @NotNull(message = "La frecuencia es obligatoria")
        TipoFrecuencia frecuencia,

        @Min(value = 1, message = "El intervalo debe ser al menos 1")
        Integer intervalo, // default 1 si no se envía

        @Min(value = 1, message = "El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)")
        @Max(value = 7, message = "El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)")
        Integer diaSemana, // para SEMANAL: 1 = Lunes .. 7 = Domingo

        @Min(value = 1, message = "El día del mes debe ser entre 1 y 31")
        @Max(value = 31, message = "El día del mes debe ser entre 1 y 31")
        Integer diaMes, // para MENSUAL: 1 .. 31

        @NotNull(message = "La fecha de inicio es obligatoria")
        LocalDate fechaInicio,

        LocalDate fechaFin, // opcional

        Boolean activa // opcional, default true
) {
}
