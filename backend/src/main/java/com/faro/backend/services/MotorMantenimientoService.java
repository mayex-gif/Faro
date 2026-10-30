package com.faro.backend.services;

import com.faro.backend.dto.GeneracionOrdenesResultadoDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.ReglaMantenimientoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Motor de recurrencia que genera automáticamente Órdenes de Trabajo (OT)
 * a partir de las reglas de mantenimiento periódico configuradas.
 */
@Service
public class MotorMantenimientoService {

    private static final Logger log = LoggerFactory.getLogger(MotorMantenimientoService.class);
    private static final String ESTADO_PLANIFICADA = "Planificada";

    private final ReglaMantenimientoRepository reglaRepository;
    private final OrdenTrabajoRepository ordenRepository;
    private final EstadoOrdenRepository estadoRepository;
    private final EventoOrdenRepository eventoRepository;
    private final CalculadorRecurrencia calculadorRecurrencia;

    public MotorMantenimientoService(ReglaMantenimientoRepository reglaRepository,
                                     OrdenTrabajoRepository ordenRepository,
                                     EstadoOrdenRepository estadoRepository,
                                     EventoOrdenRepository eventoRepository,
                                     CalculadorRecurrencia calculadorRecurrencia) {
        this.reglaRepository = reglaRepository;
        this.ordenRepository = ordenRepository;
        this.estadoRepository = estadoRepository;
        this.eventoRepository = eventoRepository;
        this.calculadorRecurrencia = calculadorRecurrencia;
    }

    /**
     * Evalúa todas las reglas activas que vencen en o antes de la fecha dada y genera sus OT.
     */
    @Transactional
    public GeneracionOrdenesResultadoDTO generarOrdenesPendientes(LocalDate fechaReferencia) {
        if (fechaReferencia == null) {
            fechaReferencia = LocalDate.now();
        }

        List<ReglaMantenimiento> candidatas = reglaRepository
                .findByActivaTrueAndProximaEjecucionLessThanEqual(fechaReferencia);

        List<OrdenTrabajoDTO> generadas = new ArrayList<>();

        for (ReglaMantenimiento regla : candidatas) {
            try {
                OrdenTrabajoDTO ot = procesarRegla(regla);
                if (ot != null) {
                    generadas.add(ot);
                }
            } catch (Exception e) {
                log.error("Error al procesar regla de mantenimiento id={}: {}", regla.getId(), e.getMessage(), e);
            }
        }

        return new GeneracionOrdenesResultadoDTO(
                fechaReferencia,
                candidatas.size(),
                generadas.size(),
                generadas
        );
    }

    /**
     * Ejecuta inmediatamente una regla específica de manera manual, generando su OT correspondiente.
     */
    @Transactional
    public OrdenTrabajoDTO ejecutarReglaManualmente(Long reglaId, LocalDate fechaReferencia) {
        if (fechaReferencia == null) {
            fechaReferencia = LocalDate.now();
        }

        ReglaMantenimiento regla = reglaRepository.findById(reglaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Regla de mantenimiento no encontrada"));

        if (!regla.isActiva()) {
            throw new OperacionNoPermitidaException("No se puede ejecutar una regla pausada");
        }

        // Si la regla ya terminó su vigencia
        if (regla.getFechaFin() != null && fechaReferencia.isAfter(regla.getFechaFin())) {
            throw new OperacionNoPermitidaException("La regla ha superado su fecha de vigencia (" + regla.getFechaFin() + ")");
        }

        OrdenTrabajoDTO resultado = procesarRegla(regla);
        if (resultado == null) {
            // procesarRegla ya avanzó la fecha cuando encontró una OT duplicada.
            resultado = procesarRegla(regla);
        }

        return resultado;
    }

    private OrdenTrabajoDTO procesarRegla(ReglaMantenimiento regla) {
        LocalDate fechaPlanificada = regla.getProximaEjecucion();

        // Si la regla tiene fecha de fin y ya la superó, la desactivamos y salimos
        if (regla.getFechaFin() != null && fechaPlanificada.isAfter(regla.getFechaFin())) {
            regla.setActiva(false);
            reglaRepository.save(regla);
            return null;
        }

        // Control de idempotencia: si ya existe una OT generada para esta regla y esta fecha planificada, avanzamos la fecha
        boolean yaExiste = ordenRepository.existsByReglaMantenimientoIdAndFechaPlanificada(regla.getId(), fechaPlanificada);
        if (yaExiste) {
            avanzarProximaEjecucion(regla);
            return null;
        }

        // Crear la nueva Orden de Trabajo
        EstadoOrden estadoInicial = estadoRepository.findFirstByInicialTrue()
                .orElseThrow(() -> new IllegalStateException("No hay un estado inicial configurado"));

        OrdenTrabajo ot = new OrdenTrabajo();
        ot.setDescripcion(regla.getDescripcion());
        ot.setTipo(regla.getTipoTrabajo());
        ot.setOrigen(OrigenOrden.PLAN_MANTENIMIENTO);
        ot.setPrioridad(regla.getPrioridad());
        ot.setLugar(regla.getLugar());
        ot.setReglaMantenimiento(regla);
        ot.setFechaPlanificada(fechaPlanificada);

        Cuadrilla cuadrilla = regla.getCuadrilla();
        EstadoOrden estadoFinal = estadoInicial;

        // Si la regla tenía cuadrilla asignada y ésta está en condiciones de tomarla, se planifica
        if (cuadrilla != null && cuadrilla.isDisponible() && cuadrilla.getTiposTrabajo().contains(regla.getTipoTrabajo())) {
            ot.setCuadrilla(cuadrilla);
            EstadoOrden estadoPlanificada = estadoRepository.findByNombreIgnoreCase(ESTADO_PLANIFICADA)
                    .orElse(estadoInicial);
            ot.setEstado(estadoPlanificada);
            estadoFinal = estadoPlanificada;
        } else {
            ot.setCuadrilla(null);
            ot.setEstado(estadoInicial);
        }

        OrdenTrabajo guardada = ordenRepository.save(ot);

        // Registro en la bitácora de eventos
        if (ot.getCuadrilla() != null && estadoFinal != estadoInicial) {
            eventoRepository.save(EventoOrden.asignacionDeCuadrilla(guardada, ot.getCuadrilla(), estadoInicial, estadoFinal));
        } else {
            eventoRepository.save(EventoOrden.cambioDeEstado(guardada, null, estadoInicial));
        }

        // Actualizar la regla de mantenimiento
        regla.setUltimaGeneracion(LocalDateTime.now());
        avanzarProximaEjecucion(regla);

        return convertirADto(guardada);
    }

    private void avanzarProximaEjecucion(ReglaMantenimiento regla) {
        LocalDate proxima = calculadorRecurrencia.calcularSiguiente(
                regla.getFrecuencia(),
                regla.getIntervalo(),
                regla.getDiaSemana(),
                regla.getDiaMes(),
                regla.getProximaEjecucion()
        );
        regla.setProximaEjecucion(proxima);

        // Si la nueva fecha de ejecución supera la fecha de fin de vigencia, pausamos la regla
        if (regla.getFechaFin() != null && proxima.isAfter(regla.getFechaFin())) {
            regla.setActiva(false);
        }
        reglaRepository.save(regla);
    }

    private OrdenTrabajoDTO convertirADto(OrdenTrabajo orden) {
        EstadoOrden estado = orden.getEstado();
        Cuadrilla cuadrilla = orden.getCuadrilla();
        return new OrdenTrabajoDTO(
                orden.getId(),
                orden.getDescripcion(),
                orden.getTipo(),
                orden.getOrigen(),
                orden.getPrioridad(),
                orden.getLugar().getId(),
                orden.getLugar().getNombre(),
                orden.getFechaCreacion(),
                estado != null ? estado.getId() : null,
                estado != null ? estado.getNombre() : null,
                estado != null ? estado.getColor() : null,
                cuadrilla != null ? cuadrilla.getId() : null,
                cuadrilla != null ? cuadrilla.getNombre() : null,
                orden.getFechaPlanificada(),
                orden.getFechaFinalizacion(),
                orden.getReglaMantenimiento() != null ? orden.getReglaMantenimiento().getId() : null
        );
    }
}
