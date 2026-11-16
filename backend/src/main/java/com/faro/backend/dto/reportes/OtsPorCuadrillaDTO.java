package com.faro.backend.dto.reportes;

/**
 * Cantidad de OTs agrupadas por cuadrilla asignada.
 * Las OTs sin cuadrilla asignada se agrupan bajo cuadrillaId=null / cuadrillaNombre="Sin asignar".
 */
public record OtsPorCuadrillaDTO(
        Long cuadrillaId,
        String cuadrillaNombre,
        long cantidad
) {
}
