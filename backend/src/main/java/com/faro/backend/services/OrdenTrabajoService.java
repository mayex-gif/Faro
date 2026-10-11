package com.faro.backend.services;

import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.EventoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.models.TransicionEstado;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Lógica de negocio de las Órdenes de Trabajo: crear, modificar, consultar y asignar.
 * Cada cambio de estado y cada asignación de cuadrilla se anota en la bitácora (EventoOrden),
 * que es la base de la Ficha Histórica del Lugar.
 */
@Service
public class OrdenTrabajoService {

    private final OrdenTrabajoRepository ordenRepository;
    private final PuntoInfraestructuraRepository lugarRepository;
    private final EstadoOrdenRepository estadoRepository;
    private final TransicionEstadoRepository transicionRepository;
    private final CuadrillaRepository cuadrillaRepository;
    private final EventoOrdenRepository eventoRepository;

    public OrdenTrabajoService(OrdenTrabajoRepository ordenRepository,
                               PuntoInfraestructuraRepository lugarRepository,
                               EstadoOrdenRepository estadoRepository,
                               TransicionEstadoRepository transicionRepository,
                               CuadrillaRepository cuadrillaRepository,
                               EventoOrdenRepository eventoRepository) {
        this.ordenRepository = ordenRepository;
        this.lugarRepository = lugarRepository;
        this.estadoRepository = estadoRepository;
        this.transicionRepository = transicionRepository;
        this.cuadrillaRepository = cuadrillaRepository;
        this.eventoRepository = eventoRepository;
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
        // Una OT cerrada (Finalizada, Cancelada) ya es historia: no se edita más
        if (orden.getEstado() != null && orden.getEstado().isCierre()) {
            throw new OperacionNoPermitidaException(
                    "No se puede modificar una orden en estado " + orden.getEstado().getNombre());
        }
        copiarDatos(request, orden);
        return convertirADto(ordenRepository.save(orden));
    }

    // ===================== CAMBIO DE ESTADO (el "árbitro") =====================

    /** Pasa una OT a otro estado, SOLO si existe el camino en la tabla de transiciones. */
    @Transactional
    public OrdenTrabajoDTO cambiarEstado(Long id, CambioEstadoRequestDTO request) {
        OrdenTrabajo orden = buscarOrden(id);
        EstadoOrden nuevo = estadoRepository.findById(request.estadoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Estado no encontrado"));
        EstadoOrden actual = orden.getEstado();

        // La pregunta clave del motor: ¿existe la flecha de "actual" a "nuevo"?
        if (actual == null || !transicionRepository.existsByOrigenIdAndDestinoId(actual.getId(), nuevo.getId())) {
            String desde = (actual == null) ? "sin estado" : actual.getNombre();
            throw new OperacionNoPermitidaException(
                    "No se puede pasar una orden de " + desde + " a " + nuevo.getNombre());
        }

        orden.setEstado(nuevo);
        OrdenTrabajo guardada = ordenRepository.save(orden);
        // Anotamos en la bitácora lo que pasó: de qué estado a qué estado
        eventoRepository.save(EventoOrden.cambioDeEstado(orden, actual, nuevo));
        return convertirADto(guardada);
    }

    // ===================== ASIGNACIÓN A CUADRILLAS =====================

    /**
     * Asigna una OT a una cuadrilla.
     * 1. Verifica que la orden esté pendiente (en estado inicial).
     * 2. Verifica que la cuadrilla exista y esté disponible (en servicio).
     * 3. Verifica que la cuadrilla cubra el tipo de trabajo de la OT.
     * 4. Pasa la orden al estado siguiente del flujo (ej: "En curso").
     */
    @Transactional
    public OrdenTrabajoDTO asignarCuadrilla(Long id, Long cuadrillaId) {
        OrdenTrabajo orden = buscarOrden(id);

        if (orden.getEstado() == null || !orden.getEstado().isInicial()) {
            throw new OperacionNoPermitidaException("La orden de trabajo ya no está pendiente");
        }

        Cuadrilla cuadrilla = cuadrillaRepository.findById(cuadrillaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cuadrilla no encontrada"));

        if (!cuadrilla.isDisponible()) {
            throw new OperacionNoPermitidaException(
                    "La cuadrilla " + cuadrilla.getNombre() + " no se encuentra disponible");
        }

        if (!cuadrilla.getTiposTrabajo().contains(orden.getTipo())) {
            throw new OperacionNoPermitidaException(
                    "La cuadrilla " + cuadrilla.getNombre() + " no realiza trabajos de tipo " + orden.getTipo());
        }

        EstadoOrden estadoAnterior = orden.getEstado();
        EstadoOrden estadoDestino = buscarEstadoDestinoAsignacion(estadoAnterior);

        orden.setCuadrilla(cuadrilla);
        orden.setEstado(estadoDestino);

        OrdenTrabajo guardada = ordenRepository.save(orden);
        // Anotamos en la bitácora: qué cuadrilla se asignó y cómo cambió el estado
        eventoRepository.save(EventoOrden.asignacionDeCuadrilla(orden, cuadrilla, estadoAnterior, estadoDestino));
        return convertirADto(guardada);
    }

    private EstadoOrden buscarEstadoDestinoAsignacion(EstadoOrden estadoActual) {
        List<TransicionEstado> transiciones = transicionRepository.findByOrigenId(estadoActual.getId());

        Optional<EstadoOrden> enCurso = transiciones.stream()
                .map(TransicionEstado::getDestino)
                .filter(destino -> "En curso".equalsIgnoreCase(destino.getNombre()))
                .findFirst();

        if (enCurso.isPresent()) {
            return enCurso.get();
        }

        return transiciones.stream()
                .map(TransicionEstado::getDestino)
                .filter(destino -> !destino.isCierre())
                .findFirst()
                .orElseThrow(() -> new OperacionNoPermitidaException(
                        "No hay un camino permitido para avanzar la orden desde su estado actual"));
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
                cuadrilla != null ? cuadrilla.getNombre() : null
        );
    }
}