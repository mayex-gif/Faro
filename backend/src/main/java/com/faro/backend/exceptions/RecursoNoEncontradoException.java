package com.faro.backend.exceptions;

/** Se lanza cuando se pide algo que no existe (ej: una OT con un id inexistente). Responde 404. */
public class RecursoNoEncontradoException extends RuntimeException {
    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}