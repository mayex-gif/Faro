package com.faro.backend.services;

import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.EventoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.TransicionEstado;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Lógica de negocio de las Órdenes de Trabajo: crear, modificar, consultar, asignar y reasignar.
 * Cada cambio de estado, cada asignación y cada reasignación de cuadrilla se anota en la bitácora (EventoOrden),
 * que es la base de la Ficha Histórica del Lugar.
 */
@Service
public class OrdenTrabajoService {

    // Estado en el que queda una OT cuando se le asigna una cuadrilla (ver buscarEstadoDestinoAsignacion).
    private static final String ESTADO_AL_ASIGNAR = "Planificada";

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
    public OrdenTrabajoDTO cambiarEstado(Long id, CambioEstadoRequestDTO request, Usuario quienLaCambia) {
        OrdenTrabajo orden = buscarOrden(id);
        validarQuePuedeCambiarElEstado(orden, quienLaCambia);
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
        if (nuevo.isCierre()) {
            orden.setFechaFinalizacion(LocalDateTime.now());
        } else if (actual != null && actual.isCierre()) {
            orden.setFechaFinalizacion(null);
        }
        OrdenTrabajo guardada = ordenRepository.save(orden);
        // Anotamos en la bitácora lo que pasó: de qué estado a qué estado
        eventoRepository.save(EventoOrden.cambioDeEstado(orden, actual, nuevo));
        return convertirADto(guardada);
    }

    /**
     * ¿Esta persona puede mover esta orden?
     * - Encargado del corralón: cualquier orden.
     * - Capataz: solo las órdenes asignadas a SU cuadrilla (si no tiene cuadrilla o es de otra → 403).
     * - Cualquier otro rol: no (el controller ya lo frena; acá se repite por las dudas).
     */
    private void validarQuePuedeCambiarElEstado(OrdenTrabajo orden, Usuario usuario) {
        if (usuario == null) {
            throw new SinPermisoException("Hay que iniciar sesión para cambiar el estado de una orden");
        }
        if (usuario.getRol() == RolUsuario.ENCARGADO_CORRALON) {
            return;
        }
        if (usuario.getRol() == RolUsuario.CAPATAZ_CUADRILLA) {
            Cuadrilla cuadrilla = orden.getCuadrilla();
            if (cuadrilla == null || !Objects.equals(cuadrilla.getId(), usuario.getCuadrillaId())) {
                throw new SinPermisoException("Esta orden no es de tu cuadrilla");
            }
            return;
        }
        throw new SinPermisoException("Tu rol no puede cambiar el estado de las órdenes");
    }

    // ===================== ASIGNACIÓN A CUADRILLAS =====================

    /**
     * Asigna una OT a una cuadrilla.
     * 1. Verifica que la orden esté pendiente (en estado inicial).
     * 2. Verifica que la cuadrilla exista y esté disponible (en servicio).
     * 3. Verifica que la cuadrilla cubra el tipo de trabajo de la OT.
     * 4. Deja la orden "Planificada": ya tiene quién la haga, pero todavía no empezó.
     *    El capataz la pasa a "En curso" cuando arranca (desde Mis tareas).
     */
    @Transactional
    public OrdenTrabajoDTO asignarCuadrilla(Long id, Long cuadrillaId) {
        OrdenTrabajo orden = buscarOrden(id);

        if (orden.getEstado() == null || !orden.getEstado().isInicial()) {
            throw new OperacionNoPermitidaException("La orden de trabajo ya no está pendiente");
        }

        Cuadrilla cuadrilla = buscarCuadrilla(cuadrillaId);
        validarQuePuedeHacerla(cuadrilla, orden);

        EstadoOrden estadoAnterior = orden.getEstado();
        EstadoOrden estadoDestino = buscarEstadoDestinoAsignacion(estadoAnterior);

        orden.setCuadrilla(cuadrilla);
        orden.setEstado(estadoDestino);

        OrdenTrabajo guardada = ordenRepository.save(orden);
        // Anotamos en la bitácora: qué cuadrilla se asignó y cómo cambió el estado
        eventoRepository.save(EventoOrden.asignacionDeCuadrilla(orden, cuadrilla, estadoAnterior, estadoDestino));
        return convertirADto(guardada);
    }

    /**
     * Pasa una OT que ya tiene cuadrilla a OTRA cuadrilla (tarjeta 18).
     * 1. Verifica que la orden no esté cerrada (Finalizada, Cancelada).
     * 2. Verifica que la orden ya tenga una cuadrilla (si no, lo que corresponde es asignarla).
     * 3. Verifica que la cuadrilla nueva exista y sea distinta de la actual.
     * 4. Verifica que la cuadrilla nueva esté disponible y cubra el tipo de trabajo (igual que al asignar).
     * 5. Cambia la cuadrilla SIN tocar el estado y lo anota en la bitácora.
     */
    @Transactional
    public OrdenTrabajoDTO reasignarCuadrilla(Long id, Long cuadrillaId) {
        OrdenTrabajo orden = buscarOrden(id);

        EstadoOrden estado = orden.getEstado();
        if (estado != null && estado.isCierre()) {
            throw new OperacionNoPermitidaException(
                    "No se puede reasignar una orden en estado " + estado.getNombre());
        }

        Cuadrilla anterior = orden.getCuadrilla();
        if (anterior == null) {
            throw new OperacionNoPermitidaException("La orden de trabajo no tiene una cuadrilla asignada");
        }

        Cuadrilla nueva = buscarCuadrilla(cuadrillaId);
        if (Objects.equals(anterior.getId(), nueva.getId())) {
            throw new OperacionNoPermitidaException(
                    "La orden de trabajo ya está asignada a " + nueva.getNombre());
        }
        validarQuePuedeHacerla(nueva, orden);

        orden.setCuadrilla(nueva); // el estado queda como estaba

        OrdenTrabajo guardada = ordenRepository.save(orden);
        // Anotamos en la bitácora: de qué cuadrilla a qué cuadrilla pasó
        eventoRepository.save(EventoOrden.reasignacionDeCuadrilla(orden, anterior, nueva));
        return convertirADto(guardada);
    }

    // Las reglas que comparten asignar y reasignar: la cuadrilla tiene que estar en servicio
    // y saber hacer ese tipo de trabajo.
    private void validarQuePuedeHacerla(Cuadrilla cuadrilla, OrdenTrabajo orden) {
        if (!cuadrilla.isDisponible()) {
            throw new OperacionNoPermitidaException(
                    "La cuadrilla " + cuadrilla.getNombre() + " no se encuentra disponible");
        }

        if (!cuadrilla.getTiposTrabajo().contains(orden.getTipo())) {
            throw new OperacionNoPermitidaException(
                    "La cuadrilla " + cuadrilla.getNombre() + " no realiza trabajos de tipo " + orden.getTipo());
        }
    }

    // Al asignar, la OT queda "Planificada" (aunque el flujo también permita ir directo a "En curso"):
    // tener cuadrilla no es lo mismo que haber empezado. Si el flujo configurado no tiene el camino
    // a "Planificada", se usa el primer estado permitido que no cierre la orden.
    private EstadoOrden buscarEstadoDestinoAsignacion(EstadoOrden estadoActual) {
        List<TransicionEstado> transiciones = transicionRepository.findByOrigenId(estadoActual.getId());

        Optional<EstadoOrden> planificada = transiciones.stream()
                .map(TransicionEstado::getDestino)
                .filter(destino -> ESTADO_AL_ASIGNAR.equalsIgnoreCase(destino.getNombre()))
                .findFirst();

        if (planificada.isPresent()) {
            return planificada.get();
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

    private Cuadrilla buscarCuadrilla(Long id) {
        return cuadrillaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cuadrilla no encontrada"));
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
                cuadrilla != null ? cuadrilla.getNombre() : null,
                orden.getFechaPlanificada(),
                orden.getFechaFinalizacion(),
                orden.getReglaMantenimiento() != null ? orden.getReglaMantenimiento().getId() : null
        );
    }
}
