package com.faro.backend.services;

import com.faro.backend.dto.DesvioOrdenDTO;
import com.faro.backend.dto.reportes.*;
import com.faro.backend.exceptions.RangoReporteInvalidoException;
import com.faro.backend.models.ClasificacionDesvio;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.repositories.ReporteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Servicio de reportes: orquesta las consultas JPA agrupadas y construye
 * los DTOs del dashboard gerencial.
 *
 * <p>Todos los métodos son solo lectura (readOnly=true) para optimizar la
 * sesión de Hibernate y evitar snapshots innecesarios.</p>
 */
@Service
@Transactional(readOnly = true)
public class ReporteService {

    private final ReporteRepository reporteRepository;
    private final CalculoDesvioService calculoDesvioService;

    public ReporteService(ReporteRepository reporteRepository,
                          CalculoDesvioService calculoDesvioService) {
        this.reporteRepository = reporteRepository;
        this.calculoDesvioService = calculoDesvioService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dashboard principal
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Construye el dashboard gerencial completo para el rango y granularidad dados.
     *
     * @param desde       Fecha de inicio del período (inclusive). Si null, usa el primer día del mes actual.
     * @param hasta       Fecha de fin del período (inclusive). Si null, usa hoy.
     * @param granularidad Granularidad de la serie temporal (DIA, SEMANA, MES). Default: MES.
     */
    public DashboardGerencialDTO construirDashboard(LocalDate desde,
                                                    LocalDate hasta,
                                                    GranularidadPeriodo granularidad) {
        return construirDashboard(desde, hasta, granularidad, null);
    }

    public DashboardGerencialDTO construirDashboard(LocalDate desde,
                                                    LocalDate hasta,
                                                    GranularidadPeriodo granularidad,
                                                    AtajoTemporalReporte atajo) {
        LocalDate[] rango = resolverRango(desde, hasta, atajo);
        LocalDate desdeEfectivo = rango[0];
        LocalDate hastaEfectivo = rango[1];
        GranularidadPeriodo granularidadEfectiva = granularidad != null ? granularidad : GranularidadPeriodo.MES;

        // Convertir a rango de timestamps (inicio del día / fin del día)
        LocalDateTime desdeTs = desdeEfectivo.atStartOfDay();
        LocalDateTime hastaTs = hastaEfectivo.atTime(LocalTime.MAX);

        // KPIs generales
        long totalOts     = reporteRepository.contarTotalOts(desdeTs, hastaTs);
        long otsCerradas  = reporteRepository.contarOtsCerradas(desdeTs, hastaTs);
        long otsPendientes = totalOts - otsCerradas;

        // Desgloses para gráficos
        List<OtsPorEstadoDTO>      porEstado      = construirPorEstado(desdeTs, hastaTs);
        List<OtsPorTipoTrabajoDTO> porTipoTrabajo = construirPorTipoTrabajo(desdeTs, hastaTs);
        List<OtsPorCuadrillaDTO>   porCuadrilla   = construirPorCuadrilla(desdeTs, hastaTs);
        List<OtsPorPeriodoDTO>     porPeriodo     = construirSerieTemporal(
                desdeTs, hastaTs, granularidadEfectiva);

        // Resumen de desvíos (solo PLAN_MANTENIMIENTO)
        ResumenDesviosGlobalDTO resumenDesvios = construirResumenDesvios(desdeEfectivo, hastaEfectivo);

        return new DashboardGerencialDTO(
                desdeEfectivo,
                hastaEfectivo,
                granularidadEfectiva,
                totalOts,
                otsCerradas,
                otsPendientes,
                porEstado,
                porTipoTrabajo,
                porCuadrilla,
                porPeriodo,
                resumenDesvios
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Métodos privados de construcción de desgloses
    // ─────────────────────────────────────────────────────────────────────────

    private List<OtsPorEstadoDTO> construirPorEstado(LocalDateTime desde, LocalDateTime hasta) {
        return reporteRepository.contarOtsPorEstado(desde, hasta)
                .stream()
                .map(row -> new OtsPorEstadoDTO(
                        (String) row[0],
                        (String) row[1],
                        (Long)   row[2]
                ))
                .toList();
    }

    private List<OtsPorTipoTrabajoDTO> construirPorTipoTrabajo(LocalDateTime desde, LocalDateTime hasta) {
        return reporteRepository.contarOtsPorTipoTrabajo(desde, hasta)
                .stream()
                .map(row -> new OtsPorTipoTrabajoDTO(
                        (TipoTrabajo) row[0],
                        (Long)        row[1]
                ))
                .toList();
    }

    private List<OtsPorCuadrillaDTO> construirPorCuadrilla(LocalDateTime desde, LocalDateTime hasta) {
        return reporteRepository.contarOtsPorCuadrilla(desde, hasta)
                .stream()
                .map(row -> new OtsPorCuadrillaDTO(
                        (Long)   row[0],
                        row[1] != null ? (String) row[1] : "Sin asignar",
                        (Long)   row[2]
                ))
                .toList();
    }

    /**
     * Construye la serie temporal combinando OTs creadas y cerradas por período.
     * Mezcla ambas listas por período con un LinkedHashMap para mantener el orden cronológico.
     */
    private List<OtsPorPeriodoDTO> construirSerieTemporal(LocalDateTime desde,
                                                           LocalDateTime hasta,
                                                           GranularidadPeriodo granularidad) {
        List<Object[]> creadas = switch (granularidad) {
            case DIA    -> reporteRepository.serieOtsCreadasPorDia(desde, hasta);
            case SEMANA -> reporteRepository.serieOtsCreadasPorSemana(desde, hasta);
            case MES    -> reporteRepository.serieOtsCreadasPorMes(desde, hasta);
        };

        List<Object[]> cerradas = switch (granularidad) {
            case DIA    -> reporteRepository.serieOtsCerradasPorDia(desde, hasta);
            case SEMANA -> reporteRepository.serieOtsCerradasPorSemana(desde, hasta);
            case MES    -> reporteRepository.serieOtsCerradasPorMes(desde, hasta);
        };

        // Reunir todos los períodos en un mapa ordenado
        Map<String, long[]> mapa = new LinkedHashMap<>();

        for (Object[] row : creadas) {
            String periodo = (String) row[0];
            mapa.computeIfAbsent(periodo, k -> new long[2])[0] = toLong(row[1]);
        }
        for (Object[] row : cerradas) {
            String periodo = (String) row[0];
            mapa.computeIfAbsent(periodo, k -> new long[2])[1] = toLong(row[1]);
        }

        List<OtsPorPeriodoDTO> serie = new ArrayList<>();
        // Ordenar los períodos lexicográficamente (el formato elegido es ISO, por lo que funciona)
        mapa.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(e -> serie.add(new OtsPorPeriodoDTO(e.getKey(), e.getValue()[0], e.getValue()[1])));

        return serie;
    }

    /**
     * Calcula el resumen global de desvíos reutilizando {@link CalculoDesvioService}.
     */
    private ResumenDesviosGlobalDTO construirResumenDesvios(LocalDate desde, LocalDate hasta) {
        List<OrdenTrabajo> ordenes = reporteRepository.buscarOtsConPlanificacion(desde, hasta);

        if (ordenes.isEmpty()) {
            return new ResumenDesviosGlobalDTO(0, 0, 0, 0, 0, 0, 0, 0.0, 0.0);
        }

        List<DesvioOrdenDTO> evaluadas = ordenes.stream()
                .map(o -> calculoDesvioService.evaluarOrden(o, LocalDate.now()))
                .toList();

        long total        = evaluadas.size();
        long aTiempo      = contar(evaluadas, ClasificacionDesvio.A_TIEMPO);
        long adelantadas  = contar(evaluadas, ClasificacionDesvio.ADELANTADA);
        long demoradas    = contar(evaluadas, ClasificacionDesvio.DEMORADA);
        long enPlazo      = contar(evaluadas, ClasificacionDesvio.PENDIENTE_EN_PLAZO);
        long vencidas     = contar(evaluadas, ClasificacionDesvio.PENDIENTE_VENCIDA);
        long canceladas   = contar(evaluadas, ClasificacionDesvio.CANCELADA);

        long totalFinalizadas = aTiempo + adelantadas + demoradas;

        double desvioPromedio = 0.0;
        if (totalFinalizadas > 0) {
            double suma = evaluadas.stream()
                    .filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.A_TIEMPO
                              || d.clasificacionDesvio() == ClasificacionDesvio.ADELANTADA
                              || d.clasificacionDesvio() == ClasificacionDesvio.DEMORADA)
                    .mapToLong(DesvioOrdenDTO::diasDesvio)
                    .sum();
            desvioPromedio = Math.round((suma / (double) totalFinalizadas) * 100.0) / 100.0;
        }

        double porcentajeCumplimiento = 0.0;
        if (totalFinalizadas > 0) {
            porcentajeCumplimiento = Math.round(
                    ((double) (aTiempo + adelantadas) / totalFinalizadas * 100.0) * 100.0) / 100.0;
        }

        return new ResumenDesviosGlobalDTO(
                total, aTiempo, adelantadas, demoradas,
                enPlazo, vencidas, canceladas,
                porcentajeCumplimiento, desvioPromedio
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private long contar(List<DesvioOrdenDTO> lista, ClasificacionDesvio clasificacion) {
        return lista.stream().filter(d -> d.clasificacionDesvio() == clasificacion).count();
    }

    /** Convierte Number → long (los drivers JDBC pueden retornar BigInteger, Long, etc.). */
    private long toLong(Object value) {
        if (value instanceof Number n) return n.longValue();
        return 0L;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Acceso a datos para exportación CSV
    // ─────────────────────────────────────────────────────────────────────────

    /** Lista de OTs completas para exportar como CSV. */
    public List<OrdenTrabajo> obtenerOtsParaCsv(LocalDate desde, LocalDate hasta) {
        return obtenerOtsParaCsv(desde, hasta, null);
    }

    public List<OrdenTrabajo> obtenerOtsParaCsv(LocalDate desde, LocalDate hasta, AtajoTemporalReporte atajo) {
        LocalDate[] rango = resolverRango(desde, hasta, atajo);
        return reporteRepository.buscarOtsParaCsv(
                rango[0].atStartOfDay(),
                rango[1].atTime(LocalTime.MAX));
    }

    /** Lista de OTs del plan de mantenimiento para exportar desvíos como CSV. */
    public List<OrdenTrabajo> obtenerDesviosParaCsv(LocalDate desde, LocalDate hasta) {
        return obtenerDesviosParaCsv(desde, hasta, null);
    }

    public List<OrdenTrabajo> obtenerDesviosParaCsv(LocalDate desde, LocalDate hasta, AtajoTemporalReporte atajo) {
        LocalDate[] rango = resolverRango(desde, hasta, atajo);
        return reporteRepository.buscarDesviosParaCsv(rango[0], rango[1]);
    }

    private LocalDate[] resolverRango(LocalDate desde, LocalDate hasta, AtajoTemporalReporte atajo) {
        LocalDate hoy = LocalDate.now();
        LocalDate desdeAtajo = switch (atajo == null ? AtajoTemporalReporte.MES : atajo) {
            case HOY -> hoy;
            case SEMANA -> hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MES -> hoy.withDayOfMonth(1);
            case AÑO -> hoy.withDayOfYear(1);
        };
        LocalDate desdeEfectivo = desde != null ? desde : desdeAtajo;
        LocalDate hastaEfectivo = hasta != null ? hasta : hoy;
        if (desdeEfectivo.isAfter(hastaEfectivo)) {
            throw new RangoReporteInvalidoException("La fecha 'desde' no puede ser posterior a 'hasta'");
        }
        return new LocalDate[]{desdeEfectivo, hastaEfectivo};
    }
}
