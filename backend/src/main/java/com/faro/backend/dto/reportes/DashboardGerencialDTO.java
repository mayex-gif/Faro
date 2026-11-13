package com.faro.backend.dto.reportes;

import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;

/**
 * Respuesta completa del dashboard gerencial de reportes.
 * Contiene todos los KPIs y agrupaciones para el período solicitado.
 */
public record DashboardGerencialDTO(
        LocalDate desde,
        LocalDate hasta,
        GranularidadPeriodo granularidad,

        // ── KPIs generales ──
        long totalOts,
        long otsCerradas,     // estados con cierre=true
        long otsPendientes,   // estados con cierre=false

        // ── Desgloses para gráficos ──
        List<OtsPorEstadoDTO>       otsPorEstado,
        List<OtsPorTipoTrabajoDTO>  otsPorTipoTrabajo,
        List<OtsPorCuadrillaDTO>    otsPorCuadrilla,
        List<OtsPorPeriodoDTO>      otsPorPeriodo,  // serie temporal
        List<MontoPorPeriodoDTO>    montoPorPeriodo,

        // ── Desvíos (solo PLAN_MANTENIMIENTO) ──
        ResumenDesviosGlobalDTO resumenDesvios,
        BigDecimal montoAproximadoTotal,  // lo declarado al crear las OTs finalizadas del período
        BigDecimal gastoAdicionalTotal    // lo que se gastó de más (declarado al finalizarlas)
) {
    /** Compatibilidad con el tablero anterior al gasto adicional. */
    public DashboardGerencialDTO(LocalDate desde, LocalDate hasta, GranularidadPeriodo granularidad,
                                 long totalOts, long otsCerradas, long otsPendientes,
                                 List<OtsPorEstadoDTO> otsPorEstado, List<OtsPorTipoTrabajoDTO> otsPorTipoTrabajo,
                                 List<OtsPorCuadrillaDTO> otsPorCuadrilla, List<OtsPorPeriodoDTO> otsPorPeriodo,
                                 List<MontoPorPeriodoDTO> montoPorPeriodo, ResumenDesviosGlobalDTO resumenDesvios,
                                 BigDecimal montoAproximadoTotal) {
        this(desde, hasta, granularidad, totalOts, otsCerradas, otsPendientes, otsPorEstado, otsPorTipoTrabajo,
                otsPorCuadrilla, otsPorPeriodo, montoPorPeriodo, resumenDesvios, montoAproximadoTotal, BigDecimal.ZERO);
    }

    public DashboardGerencialDTO(LocalDate desde, LocalDate hasta, GranularidadPeriodo granularidad,
                                 long totalOts, long otsCerradas, long otsPendientes,
                                 List<OtsPorEstadoDTO> otsPorEstado, List<OtsPorTipoTrabajoDTO> otsPorTipoTrabajo,
                                 List<OtsPorCuadrillaDTO> otsPorCuadrilla, List<OtsPorPeriodoDTO> otsPorPeriodo,
                                 ResumenDesviosGlobalDTO resumenDesvios) {
        this(desde, hasta, granularidad, totalOts, otsCerradas, otsPendientes, otsPorEstado,
                otsPorTipoTrabajo, otsPorCuadrilla, otsPorPeriodo, List.of(), resumenDesvios, BigDecimal.ZERO, BigDecimal.ZERO);
    }
}
