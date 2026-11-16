package com.faro.backend.exceptions;

/**
 * Un dato del pedido no cumple una regla que no se puede poner con anotaciones (@Size, @NotBlank...).
 * Ej: un comentario sin texto ni fotos, o una "foto" que no es una imagen. Responde 400 y dice qué campo está mal.
 */
public class DatoInvalidoException extends RuntimeException {

    private final String campo;

    public DatoInvalidoException(String campo, String mensaje) {
        super(mensaje);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
