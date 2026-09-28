package com.faro.backend.dto;

import org.locationtech.jts.geom.Geometry;

public record PuntoInfraestructuraRequestDTO(
        String nombre,
        String tipo,
        String datosTecnicos,
        Boolean estadoOperativo,
        Geometry ubicacion
) {}