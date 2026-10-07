package com.faro.backend.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Petición para asignar una Orden de Trabajo a una Cuadrilla.
 * Cuerpo esperado por PATCH /api/ordenes-trabajo/{id}/cuadrilla: { "cuadrillaId": 3 }
 */
public record AsignarCuadrillaRequestDTO(
        @NotNull(message = "El id de la cuadrilla es obligatorio")
        Long cuadrillaId
) {}
