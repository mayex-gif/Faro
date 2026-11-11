package com.faro.backend.dto;

import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;

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
        Long lugarId,

        @Size(max = 120, message = "El nombre de la primera calle no puede superar 120 caracteres")
        String calleEntre1,

        @Size(max = 120, message = "El nombre de la segunda calle no puede superar 120 caracteres")
        String calleEntre2,

        @Size(max = 20, message = "La altura no puede superar 20 caracteres")
        String altura,

        @DecimalMin(value = "0.00", message = "El monto aproximado no puede ser negativo")
        @Digits(integer = 12, fraction = 2, message = "El monto admite hasta 12 enteros y 2 decimales")
        BigDecimal montoAproximado
) {
    /** Compatibilidad con altas anteriores al detalle de ubicación y gasto. */
    public OrdenTrabajoRequestDTO(String descripcion, TipoTrabajo tipo, OrigenOrden origen,
                                  PrioridadOrden prioridad, Long lugarId) {
        this(descripcion, tipo, origen, prioridad, lugarId, null, null, null, null);
    }
}
