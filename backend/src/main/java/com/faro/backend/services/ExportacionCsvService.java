package com.faro.backend.services;

import com.faro.backend.dto.DesvioOrdenDTO;
import com.faro.backend.models.OrdenTrabajo;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Genera archivos CSV en memoria para la exportación de datos del dashboard gerencial.
 * No depende de librerías externas: usa StringBuilder para mantener el proyecto liviano.
 */
@Service
public class ExportacionCsvService {

    private static final String SEPARADOR = ";";
    private static final String NUEVA_LINEA = "\r\n"; // RFC 4180: CRLF
    private static final DateTimeFormatter FMT_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FMT_FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final CalculoDesvioService calculoDesvioService;

    public ExportacionCsvService(CalculoDesvioService calculoDesvioService) {
        this.calculoDesvioService = calculoDesvioService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CSV de OTs resueltas
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Genera el CSV completo de Órdenes de Trabajo para el período dado.
     * Columnas: ID OT | Estado | Tipo Trabajo | Cuadrilla | Lugar | Fecha Creación |
     *           Fecha Finalización | Origen | Prioridad
     *
     * @param ordenes Lista de OTs con relaciones ya cargadas (sin lazy para evitar N+1).
     * @return Bytes del CSV codificados en UTF-8.
     */
    public byte[] generarCsvOts(List<OrdenTrabajo> ordenes) {
        StringBuilder sb = new StringBuilder();

        // Cabecera con BOM UTF-8 para compatibilidad con Excel en español
        sb.append('\uFEFF');
        sb.append("ID OT").append(SEPARADOR)
          .append("Descripcion").append(SEPARADOR)
          .append("Estado").append(SEPARADOR)
          .append("Tipo Trabajo").append(SEPARADOR)
          .append("Cuadrilla").append(SEPARADOR)
          .append("Lugar").append(SEPARADOR)
          .append("Origen").append(SEPARADOR)
          .append("Prioridad").append(SEPARADOR)
          .append("Fecha Creacion").append(SEPARADOR)
          .append("Fecha Finalizacion")
          .append(NUEVA_LINEA);

        for (OrdenTrabajo ot : ordenes) {
            sb.append(ot.getId()).append(SEPARADOR)
              .append(escapar(ot.getDescripcion())).append(SEPARADOR)
              .append(escapar(ot.getEstado() != null ? ot.getEstado().getNombre() : "Sin estado")).append(SEPARADOR)
              .append(escapar(ot.getTipo().name())).append(SEPARADOR)
              .append(escapar(ot.getCuadrilla() != null ? ot.getCuadrilla().getNombre() : "Sin asignar")).append(SEPARADOR)
              .append(escapar(ot.getLugar() != null ? ot.getLugar().getNombre() : "")).append(SEPARADOR)
              .append(escapar(ot.getOrigen().name())).append(SEPARADOR)
              .append(escapar(ot.getPrioridad().name())).append(SEPARADOR)
              .append(ot.getFechaCreacion() != null ? ot.getFechaCreacion().format(FMT_FECHA_HORA) : "").append(SEPARADOR)
              .append(ot.getFechaFinalizacion() != null ? ot.getFechaFinalizacion().format(FMT_FECHA_HORA) : "")
              .append(NUEVA_LINEA);
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CSV de desvíos
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Genera el CSV de desvíos para OTs del plan de mantenimiento.
     * Columnas: ID OT | Regla | Tipo Trabajo | Lugar | Cuadrilla | Fecha Planificada |
     *           Fecha Ejecucion | Dias Desvio | Clasificacion
     *
     * @param ordenes Lista de OTs con planificación (origen = PLAN_MANTENIMIENTO).
     * @return Bytes del CSV codificados en UTF-8.
     */
    public byte[] generarCsvDesvios(List<OrdenTrabajo> ordenes) {
        StringBuilder sb = new StringBuilder();

        sb.append('\uFEFF'); // BOM UTF-8
        sb.append("ID OT").append(SEPARADOR)
          .append("Regla de Mantenimiento").append(SEPARADOR)
          .append("Tipo Trabajo").append(SEPARADOR)
          .append("Lugar").append(SEPARADOR)
          .append("Cuadrilla").append(SEPARADOR)
          .append("Fecha Planificada").append(SEPARADOR)
          .append("Fecha Ejecucion").append(SEPARADOR)
          .append("Dias Desvio").append(SEPARADOR)
          .append("Clasificacion")
          .append(NUEVA_LINEA);

        LocalDate hoy = LocalDate.now();
        for (OrdenTrabajo ot : ordenes) {
            DesvioOrdenDTO d = calculoDesvioService.evaluarOrden(ot, hoy);
            sb.append(ot.getId()).append(SEPARADOR)
              .append(escapar(d.reglaTitulo() != null ? d.reglaTitulo() : "")).append(SEPARADOR)
              .append(escapar(d.tipoTrabajo().name())).append(SEPARADOR)
              .append(escapar(d.lugarNombre())).append(SEPARADOR)
              .append(escapar(d.cuadrillaNombre() != null ? d.cuadrillaNombre() : "Sin asignar")).append(SEPARADOR)
              .append(d.fechaPlanificada() != null ? d.fechaPlanificada().format(FMT_FECHA) : "").append(SEPARADOR)
              .append(d.fechaEjecucion() != null ? d.fechaEjecucion().format(FMT_FECHA) : "").append(SEPARADOR)
              .append(d.diasDesvio()).append(SEPARADOR)
              .append(escapar(d.clasificacionDesvio().name()))
              .append(NUEVA_LINEA);
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: escape CSV estándar (RFC 4180)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Escapa un campo de texto para CSV: si contiene el separador, comillas o saltos de línea,
     * lo encierra entre comillas dobles y duplica las comillas internas.
     */
    private String escapar(String valor) {
        if (valor == null) return "";
        if (valor.contains(SEPARADOR) || valor.contains("\"") || valor.contains("\n") || valor.contains("\r")) {
            return "\"" + valor.replace("\"", "\"\"") + "\"";
        }
        return valor;
    }
}
