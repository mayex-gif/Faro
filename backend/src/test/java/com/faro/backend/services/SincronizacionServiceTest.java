package com.faro.backend.services;

import com.faro.backend.dto.AltaOrdenSinSenalDTO;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.CambioEstadoSinSenalDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.ConflictoSincronizacionException;
import com.faro.backend.exceptions.ConflictoSincronizacionException.Motivo;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.OperacionSincronizada;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.ResultadoOperacion;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.TipoOperacion;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.OperacionSincronizadaRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests de la "ventanilla de comandas atrasadas": lo hecho sin señal se aplica UNA sola vez aunque la misma
 * comanda (mismo UUID) llegue repetida, y NUNCA pisa lo que otra persona cambió antes (gana el primero que llega).
 * Todo con mocks: no se usa la base de datos. La transacción es de mentira (un PlatformTransactionManager mock):
 * alcanza para ver si se confirma (commit) o se deshace (rollback).
 * Estados como los de InicializadorEstados: 1 Pendiente, 2 Planificada, 3 En curso, 4 Finalizada (cierre).
 * La OT 7 es de la cuadrilla 1, la del capataz.
 */
@ExtendWith(MockitoExtension.class)
class SincronizacionServiceTest {

    private static final UUID COMANDA = UUID.fromString("3f2b8c1e-7a4d-4e8b-9c1f-2a6d5e4b3c21");
    private static final OffsetDateTime HECHO_EN = OffsetDateTime.of(2026, 10, 26, 10, 32, 0, 0, ZoneOffset.ofHours(-3));
    // "Yo la vi en Planificada (2) y la pasé a En curso (3)"
    private static final CambioEstadoSinSenalDTO A_EN_CURSO = new CambioEstadoSinSenalDTO(7L, 3L, 2L, HECHO_EN);

    private static final EstadoOrden PENDIENTE = estado(1L, "Pendiente", false);
    private static final EstadoOrden PLANIFICADA = estado(2L, "Planificada", false);
    private static final EstadoOrden EN_CURSO = estado(3L, "En curso", false);
    private static final EstadoOrden FINALIZADA = estado(4L, "Finalizada", true);

    @Mock
    private OperacionSincronizadaRepository operacionRepository;

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Mock
    private TransicionEstadoRepository transicionRepository;

    @Mock
    private OrdenTrabajoService ordenService;

    @Mock
    private PlatformTransactionManager manejadorTransacciones;

    private SincronizacionService service;

    private Usuario capataz;

    @BeforeEach
    void preparar() {
        service = new SincronizacionService(operacionRepository, ordenRepository, transicionRepository, ordenService,
                new TransactionTemplate(manejadorTransacciones));
        capataz = new Usuario("Carlos", "Rodríguez", "capataz.verde@generalpaz.gob.ar", "x",
                RolUsuario.CAPATAZ_CUADRILLA, 1L, true);
        capataz.setId(5L);
    }

    // ===================== Ayudantes =====================

    private static EstadoOrden estado(Long id, String nombre, boolean cierre) {
        EstadoOrden estado = new EstadoOrden(nombre, "#000000", id == 1L, cierre, id.intValue());
        estado.setId(id);
        return estado;
    }

    /** La OT 7 tal como está en el servidor: en ese estado y de esa cuadrilla. */
    private void enElServidor(EstadoOrden estado, Long cuadrillaId) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(7L);
        orden.setEstado(estado);
        Cuadrilla cuadrilla = new Cuadrilla();
        cuadrilla.setId(cuadrillaId);
        orden.setCuadrilla(cuadrilla);
        when(ordenRepository.buscarParaCambiar(7L)).thenReturn(Optional.of(orden));
    }

    private static OrdenTrabajoDTO orden(Long id, String estado) {
        return new OrdenTrabajoDTO(id, "Podar el fresno", TipoTrabajo.PODA, OrigenOrden.ORDEN_DIRECTA, PrioridadOrden.MEDIA,
                3L, "Plaza San Martín", LocalDateTime.of(2026, 10, 1, 10, 0), 3L, estado, "#9A4A12", 1L, "Cuadrilla Verde");
    }

    private static AltaOrdenSinSenalDTO altaDePoda() {
        return new AltaOrdenSinSenalDTO(new OrdenTrabajoRequestDTO("Podar el fresno", TipoTrabajo.PODA,
                OrigenOrden.RECLAMO_VECINAL, PrioridadOrden.ALTA, 3L), HECHO_EN);
    }

    /** Lo que quedó anotado como CONFLICTO (se guarda con save, afuera de la transacción que se deshizo). */
    private OperacionSincronizada conflictoAnotado() {
        ArgumentCaptor<OperacionSincronizada> anotada = ArgumentCaptor.forClass(OperacionSincronizada.class);
        verify(operacionRepository).save(anotada.capture());
        assertEquals(ResultadoOperacion.CONFLICTO, anotada.getValue().getResultado());
        return anotada.getValue();
    }

    // ===================== Cambio de estado: se aplica una sola vez =====================

    @Test
    void unCambioNuevoSeAnotaYSeAplica() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PLANIFICADA, 1L);
        when(ordenService.cambiarEstado(7L, new CambioEstadoRequestDTO(3L), capataz)).thenReturn(orden(7L, "En curso"));

        OrdenTrabajoDTO resultado = service.cambiarEstado(COMANDA, A_EN_CURSO, capataz);

        assertEquals("En curso", resultado.estadoNombre());
        ArgumentCaptor<OperacionSincronizada> anotada = ArgumentCaptor.forClass(OperacionSincronizada.class);
        verify(operacionRepository).saveAndFlush(anotada.capture());
        assertEquals(COMANDA, anotada.getValue().getId());
        assertEquals(TipoOperacion.CAMBIO_ESTADO, anotada.getValue().getTipo());
        assertEquals(5L, anotada.getValue().getUsuarioId());
        assertEquals(7L, anotada.getValue().getOrdenId());
        assertEquals(3L, anotada.getValue().getEstadoPedidoId());
        assertEquals(2L, anotada.getValue().getEstadoAnteriorId());
        assertEquals(HECHO_EN, anotada.getValue().getHechoEn());
        assertEquals(ResultadoOperacion.APLICADA, anotada.getValue().getResultado());
        verify(manejadorTransacciones).commit(any());
        verify(operacionRepository, never()).save(any());
    }

    @Test
    void laMismaComandaDosVecesNoCambiaElEstadoDeNuevo() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 7L, 3L, 2L, HECHO_EN)));
        when(ordenService.obtener(7L)).thenReturn(orden(7L, "En curso"));

        OrdenTrabajoDTO resultado = service.cambiarEstado(COMANDA, A_EN_CURSO, capataz);

        assertEquals("En curso", resultado.estadoNombre()); // responde cómo quedó la OT
        verify(ordenService, never()).cambiarEstado(any(), any(), any()); // pero no la vuelve a cambiar
        verify(operacionRepository, never()).saveAndFlush(any());
    }

    @Test
    void unNumeroQueYaUsoOtraPersonaSeRechaza() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 99L, 7L, 3L, 2L, HECHO_EN)));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals("Ese número de operación ya se usó para otro cambio", error.getMessage());
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
        verify(ordenService, never()).obtener(any());
    }

    @Test
    void unNumeroQueYaSeUsoParaOtraOrdenSeRechaza() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 8L, 3L, 2L, HECHO_EN)));

        assertThrows(OperacionNoPermitidaException.class, () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
    }

    @Test
    void siLaMismaComandaLlegaDosVecesAlMismoTiempoLaSegundaNoAplicaNada() {
        // La primera búsqueda no la encuentra (la otra todavía no terminó); al anotarla choca con la clave repetida
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty(), Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 7L, 3L, 2L, HECHO_EN)));
        when(operacionRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("clave repetida"));
        when(ordenService.obtener(7L)).thenReturn(orden(7L, "En curso"));

        OrdenTrabajoDTO resultado = service.cambiarEstado(COMANDA, A_EN_CURSO, capataz);

        assertEquals("En curso", resultado.estadoNombre());
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
    }

    @Test
    void siElChoqueNoEsPorLaComandaSeAvisaElError() {
        DataIntegrityViolationException choque = new DataIntegrityViolationException("otro problema");
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        when(operacionRepository.saveAndFlush(any())).thenThrow(choque);

        assertSame(choque, assertThrows(DataIntegrityViolationException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz)));
    }

    // ===================== Cambio de estado: conflictos =====================

    @Test
    void siOtraPersonaLaMovioAntesNoSePisaYSePuedeAplicarIgual() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PENDIENTE, 1L); // el encargado la volvió a Pendiente mientras el capataz no tenía señal
        when(transicionRepository.existsByOrigenIdAndDestinoId(1L, 3L)).thenReturn(true); // Pendiente → En curso existe

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.ESTADO_CAMBIADO, conflicto.getMotivo());
        assertEquals("Mientras no tenías señal, la OT #7 pasó a Pendiente: tu cambio no se aplicó.", conflicto.getMessage());
        assertEquals(1L, conflicto.getEstadoActualId());
        assertEquals("Pendiente", conflicto.getEstadoActual());
        assertTrue(conflicto.isSePuedeAplicar());
        verify(ordenService, never()).cambiarEstado(any(), any(), any()); // no pisa lo que hizo el otro
        verify(manejadorTransacciones).rollback(any());
        OperacionSincronizada anotada = conflictoAnotado(); // pero queda registrado
        assertEquals("ESTADO_CAMBIADO", anotada.getMotivo());
        assertEquals(conflicto.getMessage(), anotada.getMensaje());
    }

    @Test
    void siOtraPersonaLaMovioYNoHayCaminoNoSePuedeAplicarIgual() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PENDIENTE, 1L);
        when(transicionRepository.existsByOrigenIdAndDestinoId(1L, 3L)).thenReturn(false);

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.ESTADO_CAMBIADO, conflicto.getMotivo());
        assertFalse(conflicto.isSePuedeAplicar());
    }

    @Test
    void unaOrdenQueSeCerroMientrasNoHabiaSenalNoSeToca() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(FINALIZADA, 1L);

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.ORDEN_CERRADA, conflicto.getMotivo());
        assertEquals("Mientras no tenías señal, la OT #7 pasó a Finalizada: tu cambio no se aplicó.", conflicto.getMessage());
        assertFalse(conflicto.isSePuedeAplicar());
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
        assertEquals("ORDEN_CERRADA", conflictoAnotado().getMotivo());
    }

    @Test
    void siYaEstabaComoLaQueriaNoHayConflictoNiOtroEvento() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(EN_CURSO, 1L); // el encargado ya la había pasado a En curso
        when(ordenService.obtener(7L)).thenReturn(orden(7L, "En curso"));

        OrdenTrabajoDTO resultado = service.cambiarEstado(COMANDA, A_EN_CURSO, capataz);

        assertEquals("En curso", resultado.estadoNombre());
        verify(ordenService, never()).cambiarEstado(any(), any(), any()); // no se anota otro evento en la ficha
        verify(manejadorTransacciones).commit(any());
        verify(operacionRepository, never()).save(any());
    }

    @Test
    void siSeReasignoAOtraCuadrillaElCapatazYaNoLaPuedeMover() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PLANIFICADA, 2L);

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.OTRA_CUADRILLA, conflicto.getMotivo());
        assertEquals("Mientras no tenías señal, la OT #7 pasó a otra cuadrilla: tu cambio no se aplicó.", conflicto.getMessage());
        assertFalse(conflicto.isSePuedeAplicar());
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
    }

    @Test
    void elEncargadoNoTieneLaRestriccionDeCuadrilla() {
        Usuario encargado = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "x",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        encargado.setId(1L);
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PLANIFICADA, 2L);
        when(ordenService.cambiarEstado(7L, new CambioEstadoRequestDTO(3L), encargado)).thenReturn(orden(7L, "En curso"));

        assertEquals("En curso", service.cambiarEstado(COMANDA, A_EN_CURSO, encargado).estadoNombre());
    }

    @Test
    void siLaOrdenYaNoExisteEsUnConflicto() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        when(ordenRepository.buscarParaCambiar(7L)).thenReturn(Optional.empty());

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.ORDEN_NO_EXISTE, conflicto.getMotivo());
        assertEquals("Ya no existe la OT #7: tu cambio no se aplicó.", conflicto.getMessage());
        assertNull(conflicto.getEstadoActualId());
    }

    @Test
    void sinEstadoAnteriorNoSeCompara() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PENDIENTE, 1L);
        CambioEstadoSinSenalDTO sinAnterior = new CambioEstadoSinSenalDTO(7L, 3L, null, HECHO_EN);
        when(ordenService.cambiarEstado(7L, new CambioEstadoRequestDTO(3L), capataz)).thenReturn(orden(7L, "En curso"));

        assertEquals("En curso", service.cambiarEstado(COMANDA, sinAnterior, capataz).estadoNombre());
    }

    @Test
    void siNoHayCaminoEntreLosEstadosEsUnConflictoYSeDeshaceTodo() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PLANIFICADA, 1L);
        when(ordenService.cambiarEstado(7L, new CambioEstadoRequestDTO(3L), capataz))
                .thenThrow(new OperacionNoPermitidaException("No se puede pasar una orden de Planificada a En curso"));

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.CAMINO_NO_PERMITIDO, conflicto.getMotivo());
        assertEquals("No se puede pasar una orden de Planificada a En curso: tu cambio no se aplicó.", conflicto.getMessage());
        assertEquals("Planificada", conflicto.getEstadoActual());
        // Todo junto o nada: la anotación APLICADA se deshace; el conflicto se anota aparte
        verify(manejadorTransacciones).rollback(any());
        verify(manejadorTransacciones, never()).commit(any());
        assertEquals("CAMINO_NO_PERMITIDO", conflictoAnotado().getMotivo());
    }

    @Test
    void siElEstadoPedidoYaNoExisteEsUnConflicto() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PLANIFICADA, 1L);
        when(ordenService.cambiarEstado(any(), any(), any())).thenThrow(new RecursoNoEncontradoException("Estado no encontrado"));

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.DATO_NO_EXISTE, conflicto.getMotivo());
        assertEquals("Estado no encontrado: tu cambio no se aplicó.", conflicto.getMessage());
    }

    @Test
    void siLaPersonaYaNoTienePermisoEsUnConflicto() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(PLANIFICADA, 1L);
        when(ordenService.cambiarEstado(any(), any(), any()))
                .thenThrow(new SinPermisoException("Tu rol no puede cambiar el estado de las órdenes"));

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.SIN_PERMISO, conflicto.getMotivo());
    }

    @Test
    void siUnConflictoVuelveALlegarSeRespondeElMismoConflicto() {
        ConflictoSincronizacionException primero = new ConflictoSincronizacionException(Motivo.ESTADO_CAMBIADO,
                "Mientras no tenías señal, la OT #7 pasó a Pendiente: tu cambio no se aplicó.", 1L, "Pendiente", true);
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 7L, 3L, 2L, HECHO_EN).conConflicto(primero)));

        ConflictoSincronizacionException segundo = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        // Determinista: la misma comanda siempre recibe la misma respuesta (aunque la OT haya vuelto a cambiar)
        assertEquals(primero.getMotivo(), segundo.getMotivo());
        assertEquals(primero.getMessage(), segundo.getMessage());
        assertEquals(1L, segundo.getEstadoActualId());
        assertEquals("Pendiente", segundo.getEstadoActual());
        assertTrue(segundo.isSePuedeAplicar());
        verifyNoInteractions(ordenRepository);
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
    }

    @Test
    void siElMismoConflictoSeAnotaDosVecesALaVezIgualSeAvisa() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        enElServidor(FINALIZADA, 1L);
        when(operacionRepository.save(any())).thenThrow(new DataIntegrityViolationException("clave repetida"));

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals(Motivo.ORDEN_CERRADA, conflicto.getMotivo());
    }

    // ===================== Alta de orden =====================

    @Test
    void unaOrdenNuevaSeCreaYSeAnotaSuNumero() {
        Usuario mesa = new Usuario("Ana", "Martínez", "mesa@generalpaz.gob.ar", "x", RolUsuario.MESA_ENTRADAS, null, true);
        mesa.setId(2L);
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        when(operacionRepository.saveAndFlush(any())).thenAnswer(pedido -> pedido.getArgument(0));
        when(ordenService.crear(altaDePoda().orden())).thenReturn(orden(15L, "Pendiente"));

        OrdenTrabajoDTO creada = service.crearOrden(COMANDA, altaDePoda(), mesa);

        assertEquals(15L, creada.id());
        ArgumentCaptor<OperacionSincronizada> anotada = ArgumentCaptor.forClass(OperacionSincronizada.class);
        verify(operacionRepository).saveAndFlush(anotada.capture());
        assertEquals(TipoOperacion.ALTA_ORDEN, anotada.getValue().getTipo());
        assertEquals(2L, anotada.getValue().getUsuarioId());
        assertEquals(15L, anotada.getValue().getOrdenId()); // queda anotado qué OT salió de esta comanda
        assertNull(anotada.getValue().getEstadoPedidoId());
    }

    @Test
    void laMismaOrdenDosVecesSeCreaUnaSolaVez() {
        OperacionSincronizada previa = OperacionSincronizada.altaDeOrden(COMANDA, 5L, HECHO_EN);
        previa.setOrdenId(15L);
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(previa));
        when(ordenService.obtener(15L)).thenReturn(orden(15L, "Pendiente"));

        OrdenTrabajoDTO resultado = service.crearOrden(COMANDA, altaDePoda(), capataz);

        assertEquals(15L, resultado.id()); // la misma OT de la primera vez
        verify(ordenService, never()).crear(any());
    }

    @Test
    void siLaMismaOrdenLlegaDosVecesAlMismoTiempoSeCreaUnaSola() {
        OperacionSincronizada previa = OperacionSincronizada.altaDeOrden(COMANDA, 5L, HECHO_EN);
        previa.setOrdenId(15L);
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty(), Optional.of(previa));
        when(operacionRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("clave repetida"));
        when(ordenService.obtener(15L)).thenReturn(orden(15L, "Pendiente"));

        assertEquals(15L, service.crearOrden(COMANDA, altaDePoda(), capataz).id());
        verify(ordenService, never()).crear(any());
    }

    @Test
    void elNumeroDeUnCambioDeEstadoNoSirveParaCrearUnaOrden() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 7L, 3L, 2L, HECHO_EN)));

        assertThrows(OperacionNoPermitidaException.class, () -> service.crearOrden(COMANDA, altaDePoda(), capataz));
        verify(ordenService, never()).crear(any());
    }

    @Test
    void siBorraronElLugarMientrasNoHabiaSenalLaOrdenNoSeCreaYQuedaAnotado() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        when(operacionRepository.saveAndFlush(any())).thenAnswer(pedido -> pedido.getArgument(0));
        when(ordenService.crear(any())).thenThrow(new RecursoNoEncontradoException("Lugar no encontrado"));

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.crearOrden(COMANDA, altaDePoda(), capataz));

        assertEquals(Motivo.DATO_NO_EXISTE, conflicto.getMotivo());
        assertEquals("La OT \"Podar el fresno\" no se creó: Lugar no encontrado.", conflicto.getMessage());
        assertFalse(conflicto.isSePuedeAplicar());
        verify(manejadorTransacciones).rollback(any());
        OperacionSincronizada anotada = conflictoAnotado();
        assertEquals(TipoOperacion.ALTA_ORDEN, anotada.getTipo());
        assertNull(anotada.getOrdenId());
    }

    @Test
    void siUnaAltaRechazadaVuelveALlegarSeRespondeElMismoConflicto() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.altaDeOrden(COMANDA, 5L, HECHO_EN).conConflicto(new ConflictoSincronizacionException(
                        Motivo.DATO_NO_EXISTE, "La OT \"Podar el fresno\" no se creó: Lugar no encontrado."))));

        ConflictoSincronizacionException conflicto = assertThrows(ConflictoSincronizacionException.class,
                () -> service.crearOrden(COMANDA, altaDePoda(), capataz));

        assertEquals(Motivo.DATO_NO_EXISTE, conflicto.getMotivo());
        assertNull(conflicto.getEstadoActualId());
        verify(ordenService, never()).crear(any());
    }
}
