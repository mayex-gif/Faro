package com.faro.backend.exceptions;

/** Se lanza cuando un pedido choca con una regla del negocio (ej: borrar un lugar con OT). Responde 409. */
public class OperacionNoPermitidaException extends RuntimeException {
    public OperacionNoPermitidaException(String mensaje) {
        super(mensaje);
    }
}