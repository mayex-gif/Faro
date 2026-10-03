package com.faro.backend.models;

/** De dónde surge una orden de trabajo. */
public enum OrigenOrden {
    RECLAMO_VECINAL,     // lo cargó la administrativa a partir de un reclamo
    PLAN_MANTENIMIENTO,  // la generó el plan de mantenimiento (tarjeta 10)
    ORDEN_DIRECTA        // la pidió directamente el intendente o el secretario
}