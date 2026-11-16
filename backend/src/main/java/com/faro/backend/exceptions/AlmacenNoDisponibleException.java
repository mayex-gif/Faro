package com.faro.backend.exceptions;

/**
 * Se lanza cuando el almacén de fotos (S3) no está configurado o no responde
 * (claves mal puestas, servicio caído, sin conexión). No es culpa de quien pide: responde 503.
 */
public class AlmacenNoDisponibleException extends RuntimeException {
    public AlmacenNoDisponibleException(String mensaje) {
        super(mensaje);
    }

    public AlmacenNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
