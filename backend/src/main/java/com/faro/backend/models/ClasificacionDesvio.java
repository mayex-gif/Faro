package com.faro.backend.models;

/**
 * Clasificación del desvío entre lo planificado y lo ejecutado en una Orden de Trabajo.
 */
public enum ClasificacionDesvio {
    A_TIEMPO,            // Finalizada en la fecha planificada
    ADELANTADA,          // Finalizada antes de la fecha planificada
    DEMORADA,            // Finalizada después de la fecha planificada
    PENDIENTE_EN_PLAZO,  // Aún no finalizada, dentro de los plazos (hoy <= fecha planificada)
    PENDIENTE_VENCIDA,   // Aún no finalizada y plazo vencido (hoy > fecha planificada)
    CANCELADA            // Cancelada antes de su ejecución
}
