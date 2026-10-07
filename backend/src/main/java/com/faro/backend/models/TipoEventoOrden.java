package com.faro.backend.models;

/** Qué clase de cosa le pasó a una Orden de Trabajo (cada renglón de la bitácora tiene uno). */
public enum TipoEventoOrden {
    CAMBIO_ESTADO,      // la OT pasó de un estado a otro (ej: Pendiente → Planificada)
    CUADRILLA_ASIGNADA  // se le asignó una cuadrilla (y con eso la OT avanzó de estado)
}