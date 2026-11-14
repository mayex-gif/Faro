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
        // ── Montos de las OTs finalizadas del período ──
        BigDecimal montoAproximadoTotal,  // lo declarado al crear las OT
        BigDecimal gastoRealTotal,        // lo que se gastó en total (si una OT no lo tiene, cuenta lo declarado)
        BigDecimal diferenciaGastoTotal   // gastoRealTotal − montoAproximadoTotal (negativa = se gastó menos)
) {
    /** Arma el tablero con lo declarado y lo gastado: la diferencia la calcula FARO. */
    public DashboardGerencialDTO(LocalDate desde, LocalDate hasta, GranularidadPeriodo granularidad,
                                 long totalOts, long otsCerradas, long otsPendientes,
                                 List<OtsPorEstadoDTO> otsPorEstado, List<OtsPorTipoTrabajoDTO> otsPorTipoTrabajo,
                                 List<OtsPorCuadrillaDTO> otsPorCuadrilla, List<OtsPorPeriodoDTO> otsPorPeriodo,
                                 List<MontoPorPeriodoDTO> montoPorPeriodo, ResumenDesviosGlobalDTO resumenDesvios,
                                 BigDecimal montoAproximadoTotal, BigDecimal gastoRealTotal) {
        this(desde, hasta, granularidad, totalOts, otsCerradas, otsPendientes, otsPorEstado, otsPorTipoTrabajo,
                otsPorCuadrilla, otsPorPeriodo, montoPorPeriodo, resumenDesvios, montoAproximadoTotal, gastoRealTotal,
                gastoRealTotal.subtract(montoAproximadoTotal));
    }

    /** Compatibilidad con el tablero anterior al gasto real: sin el dato, se gastó lo declarado. */
    public DashboardGerencialDTO(LocalDate desde, LocalDate hasta, GranularidadPeriodo granularidad,
                                 long totalOts, long otsCerradas, long otsPendientes,
                                 List<OtsPorEstadoDTO> otsPorEstado, List<OtsPorTipoTrabajoDTO> otsPorTipoTrabajo,
                                 List<OtsPorCuadrillaDTO> otsPorCuadrilla, List<OtsPorPeriodoDTO> otsPorPeriodo,
                                 List<MontoPorPeriodoDTO> montoPorPeriodo, ResumenDesviosGlobalDTO resumenDesvios,
                                 BigDecimal montoAproximadoTotal) {
        this(desde, hasta, granularidad, totalOts, otsCerradas, otsPendientes, otsPorEstado, otsPorTipoTrabajo,
                otsPorCuadrilla, otsPorPeriodo, montoPorPeriodo, resumenDesvios, montoAproximadoTotal, montoAproximadoTotal,
                BigDecimal.ZERO);
    }

    public DashboardGerencialDTO(LocalDate desde, LocalDate hasta, GranularidadPeriodo granularidad,
                                 long totalOts, long otsCerradas, long otsPendientes,
                                 List<OtsPorEstadoDTO> otsPorEstado, List<OtsPorTipoTrabajoDTO> otsPorTipoTrabajo,
                                 List<OtsPorCuadrillaDTO> otsPorCuadrilla, List<OtsPorPeriodoDTO> otsPorPeriodo,
                                 ResumenDesviosGlobalDTO resumenDesvios) {
        this(desde, hasta, granularidad, totalOts, otsCerradas, otsPendientes, otsPorEstado,
                otsPorTipoTrabajo, otsPorCuadrilla, otsPorPeriodo, List.of(), resumenDesvios, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO);
    }
}
