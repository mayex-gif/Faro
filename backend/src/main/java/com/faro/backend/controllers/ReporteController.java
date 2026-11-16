package com.faro.backend.controllers;

import com.faro.backend.dto.reportes.DashboardGerencialDTO;
import com.faro.backend.dto.reportes.GranularidadPeriodo;
import com.faro.backend.dto.reportes.AtajoTemporalReporte;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.services.ExportacionCsvService;
import com.faro.backend.services.ReporteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Panel de Reportes e Indicadores – acceso exclusivo del ENCARGADO_CORRALON.
 * <p>
 * Endpoints:
 * <ul>
 *   <li>GET /api/reportes/dashboard             – Dashboard gerencial JSON</li>
 *   <li>GET /api/reportes/ots-resueltas/csv     – Exportación CSV de OTs</li>
 *   <li>GET /api/reportes/desvios/csv           – Exportación CSV de desvíos</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/reportes")
@Tag(name = "Reportes e Indicadores",
     description = "Dashboard gerencial con KPIs, gráficos y exportación CSV. Solo ENCARGADO_CORRALON.")
public class ReporteController {

    private static final DateTimeFormatter FMT_ARCHIVO = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final ReporteService reporteService;
    private final ExportacionCsvService exportacionCsvService;

    public ReporteController(ReporteService reporteService,
                             ExportacionCsvService exportacionCsvService) {
        this.reporteService = reporteService;
        this.exportacionCsvService = exportacionCsvService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dashboard JSON
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(
        summary = "Dashboard gerencial",
        description = """
            Retorna KPIs y desgloses para el período indicado:
            - Totales de OTs (creadas, cerradas, pendientes)
            - Agrupación por estado, tipo de trabajo y cuadrilla
            - Serie temporal (día/semana/mes)
            - Resumen de desvíos del plan de mantenimiento

            Si se omiten las fechas, usa el mes en curso. El parámetro atajo permite HOY, SEMANA, MES o AÑO.
            Si se informa desde o hasta, esa fecha explícita prevalece sobre el inicio rápido.
            Si se omite la granularidad, usa MES.
            """
    )
    public ResponseEntity<DashboardGerencialDTO> dashboard(
            @Parameter(description = "Inicio del período (ISO 8601: yyyy-MM-dd). Default: primer día del mes.")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate desde,

            @Parameter(description = "Fin del período (ISO 8601: yyyy-MM-dd). Default: hoy.")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate hasta,

            @Parameter(description = "Granularidad de la serie temporal: DIA, SEMANA, MES. Default: MES.")
            @RequestParam(required = false)
            GranularidadPeriodo granularidad,

            @Parameter(description = "Rango rápido: HOY, SEMANA, MES o AÑO. Se usa como inicio cuando se omite desde.")
            @RequestParam(required = false)
            AtajoTemporalReporte atajo) {

        DashboardGerencialDTO dto = reporteService.construirDashboard(desde, hasta, granularidad, atajo);
        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Exportación CSV – OTs resueltas
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/ots-resueltas/csv")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(
        summary = "Exportar OTs a CSV",
        description = """
            Genera y descarga un archivo CSV con las Órdenes de Trabajo finalizadas del período.
            Acepta los atajos HOY, SEMANA, MES o AÑO cuando se omite desde.
            Columnas: ID OT, Descripcion, Estado, Tipo Trabajo, Cuadrilla, Lugar,
                      Origen, Prioridad, Fecha Creacion, Fecha Finalizacion.
            """
    )
    public ResponseEntity<byte[]> exportarOtsCsv(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate desde,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate hasta,

            @RequestParam(required = false)
            AtajoTemporalReporte atajo) {

        List<OrdenTrabajo> ordenes = reporteService.obtenerOtsParaCsv(desde, hasta, atajo);
        byte[] csv = exportacionCsvService.generarCsvOts(ordenes);

        String nombreArchivo = "ots-resueltas-" + LocalDate.now().format(FMT_ARCHIVO) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .contentLength(csv.length)
                .body(csv);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Exportación CSV – Desvíos
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/desvios/csv")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(
        summary = "Exportar desvíos a CSV",
        description = """
            Genera y descarga un archivo CSV con el análisis de desvíos (planificado vs ejecutado)
            para todas las OTs del plan de mantenimiento en el período indicado. Acepta atajos HOY,
            SEMANA, MES o AÑO cuando se omite desde.
            Columnas: ID OT, Regla de Mantenimiento, Tipo Trabajo, Lugar, Cuadrilla,
                      Fecha Planificada, Fecha Ejecucion, Dias Desvio, Clasificacion.
            """
    )
    public ResponseEntity<byte[]> exportarDesviosCsv(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate desde,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate hasta,

            @RequestParam(required = false)
            AtajoTemporalReporte atajo) {

        List<OrdenTrabajo> ordenes = reporteService.obtenerDesviosParaCsv(desde, hasta, atajo);
        byte[] csv = exportacionCsvService.generarCsvDesvios(ordenes);

        String nombreArchivo = "desvios-" + LocalDate.now().format(FMT_ARCHIVO) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .contentLength(csv.length)
                .body(csv);
    }
}
