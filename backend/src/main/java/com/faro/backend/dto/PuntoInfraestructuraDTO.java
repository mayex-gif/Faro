package com.faro.backend.dto;

import org.locationtech.jts.geom.Geometry;

/**
 * Un lugar como lo ve la pantalla.
 * instalada: false = luminaria que todavía no se puso ("Falta poner"). Siempre llega true o false, nunca null.
 */
public record PuntoInfraestructuraDTO(
        Long id,
        String nombre,
        String tipo,
        String datosTecnicos,
        Boolean estadoOperativo,
        Geometry ubicacion,
        Boolean instalada
) {
    /** Compatibilidad con el constructor anterior al campo "instalada": el lugar cuenta como instalado. */
    public PuntoInfraestructuraDTO(Long id, String nombre, String tipo, String datosTecnicos,
                                   Boolean estadoOperativo, Geometry ubicacion) {
        this(id, nombre, tipo, datosTecnicos, estadoOperativo, ubicacion, true);
    }
}
