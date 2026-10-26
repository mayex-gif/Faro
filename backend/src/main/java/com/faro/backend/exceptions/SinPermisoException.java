package com.faro.backend.exceptions;

import org.springframework.security.access.AccessDeniedException;

/**
 * Se lanza cuando el usuario tiene el rol correcto pero esta acción puntual no le corresponde
 * (ej: un capataz quiere cambiar el estado de una orden de otra cuadrilla). Responde 403 con el motivo.
 * Extiende AccessDeniedException para que Spring Security la trate como "acceso denegado".
 */
public class SinPermisoException extends AccessDeniedException {
    public SinPermisoException(String mensaje) {
        super(mensaje);
    }
}
