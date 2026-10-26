package com.faro.backend.models;

/**
 * Cómo terminó una operación hecha sin señal.
 * Los dos valores están desde el principio a propósito: Hibernate arma un CHECK con los valores del enum
 * al crear la tabla y "ddl-auto=update" no lo actualiza si después se agrega otro.
 */
public enum ResultadoOperacion {
    APLICADA,  // se hizo el cambio
    CONFLICTO  // no se pudo hacer (otro la cambió antes, se cerró, se reasignó...)
}
