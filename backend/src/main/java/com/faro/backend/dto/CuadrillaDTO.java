package com.faro.backend.dto;

import com.faro.backend.models.TipoTrabajo;

import java.util.List;

/**
 * Datos de una Cuadrilla que el backend devuelve al frontend.
 * Conforme a CONTRATO_CUADRILLAS.md
 */
public record CuadrillaDTO(
        Long id,
        String nombre,
        Integer integrantes,
        List<TipoTrabajo> tiposTrabajo,
        boolean disponible
) {}
