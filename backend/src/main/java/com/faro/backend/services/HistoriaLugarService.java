package com.faro.backend.services;

import com.faro.backend.dto.EventoHistoriaDTO;
import com.faro.backend.dto.HistoriaLugarDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.EventoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * El "historiador" de la Ficha Histórica del Lugar.
 * Junta dos fuentes y arma un solo relato ordenado por fecha:
 *  1. las OT del lugar  → cuándo se registró cada una (ORDEN_CREADA)
 *  2. la bitácora       → qué les pasó después (CAMBIO_ESTADO, CUADRILLA_ASIGNADA)
 */
@Service
public class HistoriaLugarService {

    static final String ORDEN_CREADA = "ORDEN_CREADA";

    // Del más nuevo al más viejo. Si dos eventos tienen la misma fecha, la creación de la OT va
    // debajo (es lo primero que le pasó). false se ordena antes que true.
    private static final Comparator<EventoHistoriaDTO> MAS_NUEVO_PRIMERO =
            Comparator.comparing(EventoHistoriaDTO::fecha).reversed()
                    .thenComparing(evento -> ORDEN_CREADA.equals(evento.tipo()));

    private final PuntoInfraestructuraRepository lugarRepository;
    private final OrdenTrabajoRepository ordenRepository;
    private final EventoOrdenRepository eventoRepository;

    public HistoriaLugarService(PuntoInfraestructuraRepository lugarRepository,
                                OrdenTrabajoRepository ordenRepository,
                                EventoOrdenRepository eventoRepository) {
        this.lugarRepository = lugarRepository;
        this.ordenRepository = ordenRepository;
        this.eventoRepository = eventoRepository;
    }

    /** La historia completa de un lugar. Si el lugar no existe, 404. */
    @Transactional(readOnly = true)
    public HistoriaLugarDTO obtenerHistoria(Long lugarId) {
        PuntoInfraestructura lugar = lugarRepository.findById(lugarId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Lugar no encontrado"));

        List<OrdenTrabajo> ordenes = ordenRepository.findByLugarIdOrderByFechaCreacionDesc(lugarId);
        List<EventoOrden> anotaciones = eventoRepository.findByOrdenLugarIdOrderByFechaDesc(lugarId);

        // 1. Juntamos las dos fuentes en una sola lista...
        List<EventoHistoriaDTO> eventos = new ArrayList<>();
        ordenes.forEach(orden -> eventos.add(creacionDe(orden)));
        anotaciones.forEach(anotacion -> eventos.add(convertir(anotacion)));
        // 2. ...y las ordenamos como una sola línea de tiempo
        eventos.sort(MAS_NUEVO_PRIMERO);

        long cerradas = ordenes.stream().filter(this::estaCerrada).count();

        return new HistoriaLugarDTO(
                lugar.getId(),
                lugar.getNombre(),
                lugar.getTipo(),
                lugar.getDatosTecnicos(),
                lugar.getEstadoOperativo(),
                ordenes.size(),
                ordenes.size() - cerradas,
                cerradas,
                eventos
        );
    }

    // ===================== AYUDANTES =====================

    // La "partida de nacimiento" de una OT, armada a partir de su fechaCreacion
    private EventoHistoriaDTO creacionDe(OrdenTrabajo orden) {
        return new EventoHistoriaDTO(
                orden.getFechaCreacion(),
                ORDEN_CREADA,
                orden.getId(),
                orden.getDescripcion(),
                orden.getTipo(),
                orden.getOrigen(),
                orden.getPrioridad(),
                null, null, null, false, null
        );
    }

    // Un renglón de la bitácora convertido en renglón de la línea de tiempo
    private EventoHistoriaDTO convertir(EventoOrden anotacion) {
        OrdenTrabajo orden = anotacion.getOrden();
        EstadoOrden anterior = anotacion.getEstadoAnterior();
        EstadoOrden nuevo = anotacion.getEstadoNuevo();
        Cuadrilla cuadrilla = anotacion.getCuadrilla();
        return new EventoHistoriaDTO(
                anotacion.getFecha(),
                anotacion.getTipo().name(), // "CAMBIO_ESTADO" o "CUADRILLA_ASIGNADA"
                orden.getId(),
                orden.getDescripcion(),
                orden.getTipo(),
                null, null,
                anterior != null ? anterior.getNombre() : null,
                nuevo != null ? nuevo.getNombre() : null,
                nuevo != null ? nuevo.getColor() : null,
                nuevo != null && nuevo.isCierre(),
                cuadrilla != null ? cuadrilla.getNombre() : null
        );
    }

    private boolean estaCerrada(OrdenTrabajo orden) {
        return orden.getEstado() != null && orden.getEstado().isCierre();
    }
}