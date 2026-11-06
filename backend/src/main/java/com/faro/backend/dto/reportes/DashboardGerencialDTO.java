package com.faro.backend.dto.reportes;

import java.time.LocalDate;
import java.util.List;

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

        // ── Desvíos (solo PLAN_MANTENIMIENTO) ──
        ResumenDesviosGlobalDTO resumenDesvios
) {
}
