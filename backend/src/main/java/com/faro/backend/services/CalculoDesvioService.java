package com.faro.backend.services;

import com.faro.backend.dto.DesvioOrdenDTO;
import com.faro.backend.dto.ResumenDesviosDTO;
import com.faro.backend.models.ClasificacionDesvio;
import com.faro.backend.models.OrdenTrabajo;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Servicio encargado de la lógica de cálculo de desvíos (planificado vs ejecutado)
 * para Órdenes de Trabajo generadas periódicamente.
 */
@Service
public class CalculoDesvioService {

    /**
     * Evalúa el desvío individual de una Orden de Trabajo respecto a su fecha planificada.
     */
    public DesvioOrdenDTO evaluarOrden(OrdenTrabajo orden, LocalDate fechaReferencia) {
        LocalDate fechaRef = (fechaReferencia != null) ? fechaReferencia : LocalDate.now();

        LocalDate fechaPlanificada = orden.getFechaPlanificada() != null
                ? orden.getFechaPlanificada()
                : orden.getFechaCreacion().toLocalDate();

        LocalDate fechaEjecucion = null;
        long diasDesvio;
        ClasificacionDesvio clasificacion;

        boolean estaCerrada = orden.getEstado() != null && orden.getEstado().isCierre();
        boolean esCancelada = orden.getEstado() != null
                && "Cancelada".equalsIgnoreCase(orden.getEstado().getNombre());

        if (esCancelada) {
            clasificacion = ClasificacionDesvio.CANCELADA;
            diasDesvio = 0;
        } else if (estaCerrada) {
            // Se considera ejecutada/finalizada
            fechaEjecucion = orden.getFechaFinalizacion() != null
                    ? orden.getFechaFinalizacion().toLocalDate()
                    : orden.getFechaCreacion().toLocalDate();

            diasDesvio = ChronoUnit.DAYS.between(fechaPlanificada, fechaEjecucion);
            if (diasDesvio < 0) {
                clasificacion = ClasificacionDesvio.ADELANTADA;
            } else if (diasDesvio == 0) {
                clasificacion = ClasificacionDesvio.A_TIEMPO;
            } else {
                clasificacion = ClasificacionDesvio.DEMORADA;
            }
        } else {
            // Aún pendiente o en curso
            diasDesvio = ChronoUnit.DAYS.between(fechaPlanificada, fechaRef);
            if (fechaRef.isAfter(fechaPlanificada)) {
                clasificacion = ClasificacionDesvio.PENDIENTE_VENCIDA;
            } else {
                clasificacion = ClasificacionDesvio.PENDIENTE_EN_PLAZO;
            }
        }

        return new DesvioOrdenDTO(
                orden.getId(),
                orden.getReglaMantenimiento() != null ? orden.getReglaMantenimiento().getId() : null,
                orden.getReglaMantenimiento() != null ? orden.getReglaMantenimiento().getTitulo() : null,
                orden.getDescripcion(),
                orden.getTipo(),
                orden.getLugar().getId(),
                orden.getLugar().getNombre(),
                orden.getCuadrilla() != null ? orden.getCuadrilla().getId() : null,
                orden.getCuadrilla() != null ? orden.getCuadrilla().getNombre() : null,
                orden.getEstado() != null ? orden.getEstado().getNombre() : null,
                fechaPlanificada,
                fechaEjecucion,
                diasDesvio,
                clasificacion
        );
    }

    /**
     * Construye un resumen cuantitativo y porcentual del desvío para una lista de órdenes.
     */
    public ResumenDesviosDTO calcularResumen(Long reglaId, String reglaTitulo,
                                            List<OrdenTrabajo> ordenes, LocalDate fechaReferencia) {
        final LocalDate fechaRef = (fechaReferencia != null) ? fechaReferencia : LocalDate.now();

        List<DesvioOrdenDTO> evaluadas = ordenes.stream()
                .map(o -> evaluarOrden(o, fechaRef))
                .toList();

        long total = evaluadas.size();
        long aTiempo = evaluadas.stream().filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.A_TIEMPO).count();
        long adelantadas = evaluadas.stream().filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.ADELANTADA).count();
        long demoradas = evaluadas.stream().filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.DEMORADA).count();
        long enPlazo = evaluadas.stream().filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.PENDIENTE_EN_PLAZO).count();
        long vencidas = evaluadas.stream().filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.PENDIENTE_VENCIDA).count();
        long canceladas = evaluadas.stream().filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.CANCELADA).count();

        long totalFinalizadas = aTiempo + adelantadas + demoradas;

        double desvioPromedio = 0.0;
        if (totalFinalizadas > 0) {
            double sumaDesvios = evaluadas.stream()
                    .filter(d -> d.clasificacionDesvio() == ClasificacionDesvio.A_TIEMPO
                            || d.clasificacionDesvio() == ClasificacionDesvio.ADELANTADA
                            || d.clasificacionDesvio() == ClasificacionDesvio.DEMORADA)
                    .mapToLong(DesvioOrdenDTO::diasDesvio)
                    .sum();
            desvioPromedio = Math.round((sumaDesvios / (double) totalFinalizadas) * 100.0) / 100.0;
        }

        double porcentajeCumplimiento = 0.0;
        if (totalFinalizadas > 0) {
            porcentajeCumplimiento = Math.round((((double) (aTiempo + adelantadas) * 100.0) / (double) totalFinalizadas) * 100.0) / 100.0;
        }

        return new ResumenDesviosDTO(
                reglaId,
                reglaTitulo,
                total,
                aTiempo,
                adelantadas,
                demoradas,
                enPlazo,
                vencidas,
                canceladas,
                desvioPromedio,
                porcentajeCumplimiento,
                evaluadas
        );
    }
}
