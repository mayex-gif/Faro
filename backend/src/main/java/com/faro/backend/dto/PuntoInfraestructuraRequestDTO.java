package com.faro.backend.dto;

import org.locationtech.jts.geom.Geometry;

/**
 * Lo que manda la pantalla para crear o modificar un lugar.
 * instalada es opcional: si no viene, al crear queda instalada y al modificar no se toca.
 */
public record PuntoInfraestructuraRequestDTO(
        String nombre,
        String tipo,
        String datosTecnicos,
        Boolean estadoOperativo,
        Geometry ubicacion,
        Boolean instalada
) {
    /** Compatibilidad con los pedidos anteriores al campo "instalada". */
    public PuntoInfraestructuraRequestDTO(String nombre, String tipo, String datosTecnicos,
                                          Boolean estadoOperativo, Geometry ubicacion) {
        this(nombre, tipo, datosTecnicos, estadoOperativo, ubicacion, null);
    }
}
