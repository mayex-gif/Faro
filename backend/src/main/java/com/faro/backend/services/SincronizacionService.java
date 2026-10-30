package com.faro.backend.services;

import com.faro.backend.dto.AltaOrdenSinSenalDTO;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.CambioEstadoSinSenalDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.ConflictoSincronizacionException;
import com.faro.backend.exceptions.ConflictoSincronizacionException.Motivo;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.OperacionSincronizada;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.ResultadoOperacion;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.TipoOperacion;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.OperacionSincronizadaRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * La "ventanilla de comandas atrasadas": recibe lo que se hizo en el celular sin señal.
 * Cada operación trae su número de comanda (UUID).
 * - Número nuevo → se anota y se aplica (cambio de estado o alta de OT), todo junto o nada.
 * - Número que ya llegó → NO se aplica de nuevo: se responde lo mismo que la primera vez. Un reintento no duplica nada.
 *
 * Conflictos (regla determinista: GANA EL PRIMERO QUE LLEGA AL SERVIDOR).
 * El celular dice en qué estado vio la OT ("yo la vi en Planificada"). Si en el servidor ya está en otro estado,
 * el cambio NO pisa lo que hizo otra persona: se responde 409 con el motivo, y queda registrado como CONFLICTO.
 * Se revisa en este orden: la OT existe → sigue siendo de tu cuadrilla → ya estaba así (no hay nada que hacer)
 * → no está cerrada → nadie la cambió → el resto de las reglas de siempre (OrdenTrabajoService).
 *
 * Por qué TransactionTemplate y no @Transactional: el choque de dos envíos iguales a la vez, y el registro
 * de un conflicto, tienen que pasar AFUERA de la transacción que se deshizo (si no, se deshacen con ella).
 */
@Service
public class SincronizacionService {

    private final OperacionSincronizadaRepository operacionRepository;
    private final OrdenTrabajoRepository ordenRepository;
    private final TransicionEstadoRepository transicionRepository;
    private final OrdenTrabajoService ordenService;
    private final TransactionTemplate transaccion;

    public SincronizacionService(OperacionSincronizadaRepository operacionRepository,
                                 OrdenTrabajoRepository ordenRepository,
                                 TransicionEstadoRepository transicionRepository,
                                 OrdenTrabajoService ordenService,
                                 TransactionTemplate transaccion) {
        this.operacionRepository = operacionRepository;
        this.ordenRepository = ordenRepository;
        this.transicionRepository = transicionRepository;
        this.ordenService = ordenService;
        this.transaccion = transaccion;
    }

    // ===================== CAMBIO DE ESTADO =====================

    /** Un cambio de estado hecho sin señal. */
    public OrdenTrabajoDTO cambiarEstado(UUID operacionId, CambioEstadoSinSenalDTO pedido, Usuario usuario) {
        Optional<OperacionSincronizada> previa = operacionRepository.findById(operacionId);
        if (previa.isPresent()) {
            return repetida(previa.get(), TipoOperacion.CAMBIO_ESTADO, pedido.ordenId(), usuario);
        }
        try {
            return transaccion.execute(estado -> {
                // Primero se anota el número: si otro envío igual se está procesando, acá choca y espera.
                operacionRepository.saveAndFlush(nuevoCambio(operacionId, pedido, usuario));
                return aplicarCambio(pedido, usuario);
            });
        } catch (DataIntegrityViolationException choque) {
            return repetida(buscarDespuesDelChoque(operacionId, choque), TipoOperacion.CAMBIO_ESTADO,
                    pedido.ordenId(), usuario);
        } catch (ConflictoSincronizacionException conflicto) {
            // La transacción ya se deshizo (la OT quedó como estaba): ahora se anota el conflicto aparte
            registrarConflicto(nuevoCambio(operacionId, pedido, usuario).conConflicto(conflicto));
            throw conflicto;
        }
    }

    private static OperacionSincronizada nuevoCambio(UUID operacionId, CambioEstadoSinSenalDTO pedido, Usuario usuario) {
        return OperacionSincronizada.cambioDeEstado(operacionId, usuario.getId(), pedido.ordenId(), pedido.estadoId(),
                pedido.estadoAnteriorId(), pedido.hechoEn());
    }

    private OrdenTrabajoDTO aplicarCambio(CambioEstadoSinSenalDTO pedido, Usuario usuario) {
        String laOt = "la OT #" + pedido.ordenId();
        // "Agarra" la OT hasta terminar: si otro cambio de la misma OT llega a la vez, espera y después la ve cambiada
        OrdenTrabajo orden = ordenRepository.buscarParaCambiar(pedido.ordenId())
                .orElseThrow(() -> new ConflictoSincronizacionException(Motivo.ORDEN_NO_EXISTE,
                        "Ya no existe " + laOt + ": tu cambio no se aplicó."));
        EstadoOrden actual = orden.getEstado();
        Long actualId = (actual == null) ? null : actual.getId();
        String actualNombre = (actual == null) ? null : actual.getNombre();

        if (esCapatazDeOtraCuadrilla(orden, usuario)) {
            throw new ConflictoSincronizacionException(Motivo.OTRA_CUADRILLA,
                    "Mientras no tenías señal, " + laOt + " pasó a otra cuadrilla: tu cambio no se aplicó.",
                    actualId, actualNombre, false);
        }
        if (Objects.equals(actualId, pedido.estadoId())) {
            // Alguien ya la dejó como la querías: no hay nada que cambiar (y no se anota otro evento en la ficha)
            return ordenService.obtener(pedido.ordenId());
        }
        if (actual != null && actual.isCierre()) {
            throw new ConflictoSincronizacionException(Motivo.ORDEN_CERRADA,
                    "Mientras no tenías señal, " + laOt + " pasó a " + actualNombre + ": tu cambio no se aplicó.",
                    actualId, actualNombre, false);
        }
        if (pedido.estadoAnteriorId() != null && !Objects.equals(actualId, pedido.estadoAnteriorId())) {
            // Otra persona la movió antes. ¿Se puede "aplicar igual"? Solo si existe el camino desde donde está ahora.
            boolean sePuede = actualId != null && transicionRepository.existsByOrigenIdAndDestinoId(actualId, pedido.estadoId());
            throw new ConflictoSincronizacionException(Motivo.ESTADO_CAMBIADO,
                    "Mientras no tenías señal, " + laOt + " pasó a " + actualNombre + ": tu cambio no se aplicó.",
                    actualId, actualNombre, sePuede);
        }
        try {
            // Las reglas de siempre (permisos, caminos entre estados) y el evento de la ficha
            return ordenService.cambiarEstado(pedido.ordenId(), new CambioEstadoRequestDTO(pedido.estadoId()), usuario);
        } catch (RecursoNoEncontradoException e) {
            throw new ConflictoSincronizacionException(Motivo.DATO_NO_EXISTE,
                    e.getMessage() + ": tu cambio no se aplicó.", actualId, actualNombre, false);
        } catch (OperacionNoPermitidaException e) {
            throw new ConflictoSincronizacionException(Motivo.CAMINO_NO_PERMITIDO,
                    e.getMessage() + ": tu cambio no se aplicó.", actualId, actualNombre, false);
        } catch (SinPermisoException e) {
            throw new ConflictoSincronizacionException(Motivo.SIN_PERMISO,
                    e.getMessage() + ": tu cambio no se aplicó.", actualId, actualNombre, false);
        }
    }

    // El capataz solo mueve las OT de su cuadrilla. Si se la reasignaron mientras no tenía señal, es un conflicto.
    private static boolean esCapatazDeOtraCuadrilla(OrdenTrabajo orden, Usuario usuario) {
        if (usuario.getRol() != RolUsuario.CAPATAZ_CUADRILLA) {
            return false;
        }
        Cuadrilla cuadrilla = orden.getCuadrilla();
        return cuadrilla == null || !Objects.equals(cuadrilla.getId(), usuario.getCuadrillaId());
    }

    // ===================== ALTA DE ORDEN =====================

    /** Una OT cargada sin señal. */
    public OrdenTrabajoDTO crearOrden(UUID operacionId, AltaOrdenSinSenalDTO pedido, Usuario usuario) {
        Optional<OperacionSincronizada> previa = operacionRepository.findById(operacionId);
        if (previa.isPresent()) {
            return repetida(previa.get(), TipoOperacion.ALTA_ORDEN, null, usuario);
        }
        try {
            return transaccion.execute(estado -> {
                OperacionSincronizada operacion = operacionRepository.saveAndFlush(
                        OperacionSincronizada.altaDeOrden(operacionId, usuario.getId(), pedido.hechoEn()));
                OrdenTrabajoDTO creada = crear(pedido);
                // Se anota qué OT salió de esta comanda: si la comanda vuelve a llegar, se responde esta misma OT
                operacion.setOrdenId(creada.id());
                return creada;
            });
        } catch (DataIntegrityViolationException choque) {
            return repetida(buscarDespuesDelChoque(operacionId, choque), TipoOperacion.ALTA_ORDEN, null, usuario);
        } catch (ConflictoSincronizacionException conflicto) {
            registrarConflicto(OperacionSincronizada.altaDeOrden(operacionId, usuario.getId(), pedido.hechoEn())
                    .conConflicto(conflicto));
            throw conflicto;
        }
    }

    private OrdenTrabajoDTO crear(AltaOrdenSinSenalDTO pedido) {
        try {
            return ordenService.crear(pedido.orden());
        } catch (RecursoNoEncontradoException e) {
            // Ej: borraron el lugar mientras no había señal
            throw new ConflictoSincronizacionException(Motivo.DATO_NO_EXISTE,
                    "La OT \"" + pedido.orden().descripcion() + "\" no se creó: " + e.getMessage() + ".");
        }
    }

    // ===================== AYUDANTES =====================

    /**
     * La comanda ya había llegado: no se aplica de nuevo, se responde lo mismo que la primera vez
     * (la OT como está ahora, o el mismo conflicto). Si el número es de OTRA persona u OTRO cambio
     * (no debería pasar: el celular inventa números únicos), se rechaza con 409 para no mezclar operaciones.
     */
    private OrdenTrabajoDTO repetida(OperacionSincronizada previa, TipoOperacion tipo, Long ordenId, Usuario usuario) {
        boolean esLaMisma = previa.getTipo() == tipo
                && Objects.equals(previa.getUsuarioId(), usuario.getId())
                && (ordenId == null || Objects.equals(previa.getOrdenId(), ordenId));
        if (!esLaMisma) {
            throw new OperacionNoPermitidaException("Ese número de operación ya se usó para otro cambio");
        }
        if (previa.getResultado() == ResultadoOperacion.CONFLICTO) {
            throw previa.comoConflicto();
        }
        return ordenService.obtener(previa.getOrdenId());
    }

    // Después del choque, el otro envío ya terminó: su renglón está guardado.
    private OperacionSincronizada buscarDespuesDelChoque(UUID operacionId, DataIntegrityViolationException choque) {
        return operacionRepository.findById(operacionId).orElseThrow(() -> choque);
    }

    private void registrarConflicto(OperacionSincronizada operacion) {
        try {
            operacionRepository.save(operacion);
        } catch (DataIntegrityViolationException yaAnotada) {
            // La misma comanda llegó dos veces a la vez y la otra ya anotó este mismo conflicto: no hace falta nada más
        }
    }
}
