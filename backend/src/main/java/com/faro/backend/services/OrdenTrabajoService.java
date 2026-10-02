package com.faro.backend.services;

import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Lógica de negocio de las Órdenes de Trabajo: crear, modificar y consultar. */
@Service
public class OrdenTrabajoService {

    private final OrdenTrabajoRepository ordenRepository;
    private final PuntoInfraestructuraRepository lugarRepository;
    private final EstadoOrdenRepository estadoRepository;

    public OrdenTrabajoService(OrdenTrabajoRepository ordenRepository,
                               PuntoInfraestructuraRepository lugarRepository,
                               EstadoOrdenRepository estadoRepository) {
        this.ordenRepository = ordenRepository;
        this.lugarRepository = lugarRepository;
        this.estadoRepository = estadoRepository;
    }

    // ===================== CONSULTAS =====================

    /** Todas las OT, de la más nueva a la más vieja. */
    @Transactional(readOnly = true)
    public List<OrdenTrabajoDTO> listar() {
        return ordenRepository.findAll(Sort.by(Sort.Direction.DESC, "fechaCreacion")).stream()
                .map(this::convertirADto)
                .toList();
    }

    /** Las OT de un lugar (la base de la futura "ficha histórica del lugar"). */
    @Transactional(readOnly = true)
    public List<OrdenTrabajoDTO> listarPorLugar(Long lugarId) {
        if (!lugarRepository.existsById(lugarId)) {
            throw new RecursoNoEncontradoException("Lugar no encontrado");
        }
        return ordenRepository.findByLugarIdOrderByFechaCreacionDesc(lugarId).stream()
                .map(this::convertirADto)
                .toList();
    }

    /** Una OT por su id. */
    @Transactional(readOnly = true)
    public OrdenTrabajoDTO obtener(Long id) {
        return convertirADto(buscarOrden(id));
    }

    // ===================== ALTA Y MODIFICACIÓN =====================

    @Transactional
    public OrdenTrabajoDTO crear(OrdenTrabajoRequestDTO request) {
        OrdenTrabajo orden = new OrdenTrabajo();
        copiarDatos(request, orden);
        orden.setEstado(buscarEstadoInicial()); // toda OT nueva arranca en el estado inicial
        return convertirADto(ordenRepository.save(orden));
    }

    @Transactional
    public OrdenTrabajoDTO modificar(Long id, OrdenTrabajoRequestDTO request) {
        OrdenTrabajo orden = buscarOrden(id);
        copiarDatos(request, orden);
        return convertirADto(ordenRepository.save(orden));
    }

    // ===================== AYUDANTES =====================

    private OrdenTrabajo buscarOrden(Long id) {
        return ordenRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Orden de trabajo no encontrada"));
    }

    private EstadoOrden buscarEstadoInicial() {
        return estadoRepository.findFirstByInicialTrue()
                .orElseThrow(() -> new IllegalStateException("No hay un estado inicial configurado"));
    }

    // Pasa los datos de la "comanda" a la entidad. Verifica que el lugar exista.
    private void copiarDatos(OrdenTrabajoRequestDTO request, OrdenTrabajo orden) {
        PuntoInfraestructura lugar = lugarRepository.findById(request.lugarId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Lugar no encontrado"));

        orden.setDescripcion(request.descripcion().trim());
        orden.setTipo(request.tipo());
        orden.setOrigen(request.origen());
        orden.setPrioridad(request.prioridad());
        orden.setLugar(lugar);
    }

    private OrdenTrabajoDTO convertirADto(OrdenTrabajo orden) {
        EstadoOrden estado = orden.getEstado(); // puede ser null solo en OT viejas, antes del inicializador
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
                estado != null ? estado.getColor() : null
        );
    }
}