package com.faro.backend.services;

import com.faro.backend.dto.AltaOrdenSinSenalDTO;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.CambioEstadoSinSenalDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.OperacionSincronizada;
import com.faro.backend.models.TipoOperacion;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.OperacionSincronizadaRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * La "ventanilla de comandas atrasadas": recibe lo que se hizo en el celular sin señal.
 * Cada operación trae su número de comanda (UUID). La regla es simple:
 * - Número nuevo → se anota y se aplica (cambio de estado o alta de OT), todo junto o nada.
 * - Número que ya llegó → NO se aplica de nuevo: se responde cómo quedó la OT. Así un reintento no duplica nada.
 *
 * Las reglas del negocio (permisos, caminos entre estados, validaciones) siguen en OrdenTrabajoService:
 * acá no se repiten, se usan.
 *
 * Por qué TransactionTemplate y no @Transactional: si dos envíos de la misma comanda llegan al mismo tiempo,
 * el segundo choca con la clave repetida al anotarla. Ese choque arruina su transacción, así que hay que
 * atraparlo AFUERA de ella para poder responder bien (con la OT como quedó) en vez de un error 500.
 */
@Service
public class SincronizacionService {

    private final OperacionSincronizadaRepository operacionRepository;
    private final OrdenTrabajoService ordenService;
    private final TransactionTemplate transaccion;

    public SincronizacionService(OperacionSincronizadaRepository operacionRepository,
                                 OrdenTrabajoService ordenService,
                                 TransactionTemplate transaccion) {
        this.operacionRepository = operacionRepository;
        this.ordenService = ordenService;
        this.transaccion = transaccion;
    }

    /** Un cambio de estado hecho sin señal. */
    public OrdenTrabajoDTO cambiarEstado(UUID operacionId, CambioEstadoSinSenalDTO pedido, Usuario usuario) {
        Optional<OperacionSincronizada> previa = operacionRepository.findById(operacionId);
        if (previa.isPresent()) {
            return repetida(previa.get(), TipoOperacion.CAMBIO_ESTADO, pedido.ordenId(), usuario);
        }
        try {
            return transaccion.execute(estado -> {
                // Primero se anota el número: si otro envío igual se está procesando, acá choca y espera.
                operacionRepository.saveAndFlush(OperacionSincronizada.cambioDeEstado(
                        operacionId, usuario.getId(), pedido.ordenId(), pedido.estadoId(), pedido.hechoEn()));
                return ordenService.cambiarEstado(pedido.ordenId(), new CambioEstadoRequestDTO(pedido.estadoId()), usuario);
            });
        } catch (DataIntegrityViolationException choque) {
            return repetida(buscarDespuesDelChoque(operacionId, choque), TipoOperacion.CAMBIO_ESTADO,
                    pedido.ordenId(), usuario);
        }
    }

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
                OrdenTrabajoDTO creada = ordenService.crear(pedido.orden());
                // Se anota qué OT salió de esta comanda: si la comanda vuelve a llegar, se responde esta misma OT
                operacion.setOrdenId(creada.id());
                return creada;
            });
        } catch (DataIntegrityViolationException choque) {
            return repetida(buscarDespuesDelChoque(operacionId, choque), TipoOperacion.ALTA_ORDEN, null, usuario);
        }
    }

    /**
     * La comanda ya había llegado: no se aplica de nuevo, se responde la OT como está ahora.
     * Si el número es de OTRA persona u OTRO cambio (no debería pasar: el celular inventa números únicos),
     * se rechaza con 409 para no mezclar operaciones.
     */
    private OrdenTrabajoDTO repetida(OperacionSincronizada previa, TipoOperacion tipo, Long ordenId, Usuario usuario) {
        boolean esLaMisma = previa.getTipo() == tipo
                && Objects.equals(previa.getUsuarioId(), usuario.getId())
                && (ordenId == null || Objects.equals(previa.getOrdenId(), ordenId));
        if (!esLaMisma) {
            throw new OperacionNoPermitidaException("Ese número de operación ya se usó para otro cambio");
        }
        return ordenService.obtener(previa.getOrdenId());
    }

    // Después del choque, el otro envío ya terminó: su renglón está guardado.
    private OperacionSincronizada buscarDespuesDelChoque(UUID operacionId, DataIntegrityViolationException choque) {
        return operacionRepository.findById(operacionId).orElseThrow(() -> choque);
    }
}
