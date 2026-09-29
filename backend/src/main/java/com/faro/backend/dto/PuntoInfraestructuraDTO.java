package com.faro.backend.dto;

import org.locationtech.jts.geom.Geometry;

public record PuntoInfraestructuraDTO(
        Long id,
        String nombre,
        String tipo,
        String datosTecnicos,
        Boolean estadoOperativo,
        Geometry ubicacion
) {}