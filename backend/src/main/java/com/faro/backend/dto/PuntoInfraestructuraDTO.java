package com.faro.backend.dto;

import org.locationtech.jts.geom.Geometry;

/**
 * Un lugar como lo ve la pantalla.
 * instalada: false = luminaria que todavía no se puso ("Falta poner"). Siempre llega true o false, nunca null.
 * nueva: solo luminarias instaladas. true = Nueva, false = Vieja, null = "Sin marcar" (y siempre null en otros tipos).
 */
public record PuntoInfraestructuraDTO(
        Long id,
        String nombre,
        String tipo,
        String datosTecnicos,
        Boolean estadoOperativo,
        Geometry ubicacion,
        Boolean instalada,
        Boolean nueva
) {
    /** Compatibilidad con el constructor anterior al campo "instalada": el lugar cuenta como instalado. */
    public PuntoInfraestructuraDTO(Long id, String nombre, String tipo, String datosTecnicos,
                                   Boolean estadoOperativo, Geometry ubicacion) {
        this(id, nombre, tipo, datosTecnicos, estadoOperativo, ubicacion, true, null);
    }

    /** Compatibilidad con el constructor anterior al campo "nueva": queda "Sin marcar". */
    public PuntoInfraestructuraDTO(Long id, String nombre, String tipo, String datosTecnicos,
                                   Boolean estadoOperativo, Geometry ubicacion, Boolean instalada) {
        this(id, nombre, tipo, datosTecnicos, estadoOperativo, ubicacion, instalada, null);
    }
}
