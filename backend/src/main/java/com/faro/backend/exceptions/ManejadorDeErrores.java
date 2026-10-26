package com.faro.backend.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Atrapa los errores de TODOS los controllers y los convierte en respuestas claras,
 * con el código HTTP correcto y un mensaje legible.
 */
@RestControllerAdvice
public class ManejadorDeErrores {

    /** Forma de todas las respuestas de error. "errores" detalla qué campo está mal (si aplica). */
    public record RespuestaError(int estado, String mensaje, Map<String, String> errores) {}

    // 404: lo pedido no existe
    @ExceptionHandler(RecursoNoEncontradoException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public RespuestaError noEncontrado(RecursoNoEncontradoException e) {
        return new RespuestaError(404, e.getMessage(), Map.of());
    }

    // 409: choca con una regla del negocio
    @ExceptionHandler(OperacionNoPermitidaException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public RespuestaError noPermitido(OperacionNoPermitidaException e) {
        return new RespuestaError(409, e.getMessage(), Map.of());
    }

    // 409: un cambio hecho sin señal que ya no vale (otra persona cambió la OT antes, se cerró, se reasignó...).
    // "errores" dice el motivo, en qué estado está ahora y si todavía se puede "aplicar igual".
    @ExceptionHandler(ConflictoSincronizacionException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public RespuestaError conflictoSinSenal(ConflictoSincronizacionException e) {
        Map<String, String> detalle = new LinkedHashMap<>(); // LinkedHashMap (y no Map.of) porque algún dato puede faltar
        detalle.put("motivo", e.getMotivo().name());
        detalle.put("sePuedeAplicar", String.valueOf(e.isSePuedeAplicar()));
        if (e.getEstadoActualId() != null) {
            detalle.put("estadoActualId", String.valueOf(e.getEstadoActualId()));
            detalle.put("estadoActual", e.getEstadoActual());
        }
        return new RespuestaError(409, e.getMessage(), detalle);
    }

    // 400: no pasó las validaciones (@NotBlank, @NotNull...). Detalla cada campo con problema.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public RespuestaError datosInvalidos(MethodArgumentNotValidException e) {
        Map<String, String> errores = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(campo -> errores.putIfAbsent(campo.getField(), campo.getDefaultMessage()));
        return new RespuestaError(400, "Hay datos inválidos en el pedido", errores);
    }

    // 400: el JSON está mal armado o trae un valor que no existe (ej: "tipo": "PODAA")
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public RespuestaError formatoInvalido(HttpMessageNotReadableException e) {
        return new RespuestaError(400, "El pedido tiene un formato inválido o algún valor no permitido", Map.of());
    }

    // 401: credenciales incorrectas o sesión no autenticada
    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public RespuestaError credencialesInvalidas(org.springframework.security.authentication.BadCredentialsException e) {
        return new RespuestaError(401, e.getMessage(), Map.of());
    }

    // 403: tiene el rol, pero esta acción puntual no le toca (ej: una orden de otra cuadrilla). Explica el motivo.
    @ExceptionHandler(SinPermisoException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public RespuestaError sinPermiso(SinPermisoException e) {
        return new RespuestaError(403, e.getMessage(), Map.of());
    }

    // 403: acceso denegado por falta de permisos (el rol no alcanza, ej: @PreAuthorize)
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public RespuestaError accesoDenegado(org.springframework.security.access.AccessDeniedException e) {
        return new RespuestaError(403, "No tiene permisos para realizar esta acción", Map.of());
    }
}