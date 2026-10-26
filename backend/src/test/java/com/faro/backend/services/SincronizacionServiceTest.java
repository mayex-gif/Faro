package com.faro.backend.services;

import com.faro.backend.dto.AltaOrdenSinSenalDTO;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.CambioEstadoSinSenalDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.OperacionSincronizada;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.ResultadoOperacion;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.TipoOperacion;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.OperacionSincronizadaRepository;
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
 * Tests de la "ventanilla de comandas atrasadas": lo hecho sin señal se aplica UNA sola vez,
 * aunque la misma comanda (mismo UUID) llegue repetida. Todo con mocks: no se usa la base de datos.
 * La transacción es de mentira (un PlatformTransactionManager mock): alcanza para ver si se confirma o se deshace.
 */
@ExtendWith(MockitoExtension.class)
class SincronizacionServiceTest {

    private static final UUID COMANDA = UUID.fromString("3f2b8c1e-7a4d-4e8b-9c1f-2a6d5e4b3c21");
    private static final OffsetDateTime HECHO_EN = OffsetDateTime.of(2026, 10, 26, 10, 32, 0, 0, ZoneOffset.ofHours(-3));
    private static final CambioEstadoSinSenalDTO A_EN_CURSO = new CambioEstadoSinSenalDTO(7L, 3L, HECHO_EN);

    @Mock
    private OperacionSincronizadaRepository operacionRepository;

    @Mock
    private OrdenTrabajoService ordenService;

    @Mock
    private PlatformTransactionManager manejadorTransacciones;

    private SincronizacionService service;

    private Usuario capataz;

    @BeforeEach
    void preparar() {
        service = new SincronizacionService(operacionRepository, ordenService, new TransactionTemplate(manejadorTransacciones));
        capataz = new Usuario("Carlos", "Rodríguez", "capataz.verde@generalpaz.gob.ar", "x",
                RolUsuario.CAPATAZ_CUADRILLA, 1L, true);
        capataz.setId(5L);
    }

    private static OrdenTrabajoDTO orden(Long id, String estado) {
        return new OrdenTrabajoDTO(id, "Podar el fresno", TipoTrabajo.PODA, OrigenOrden.ORDEN_DIRECTA, PrioridadOrden.MEDIA,
                3L, "Plaza San Martín", LocalDateTime.of(2026, 10, 1, 10, 0), 3L, estado, "#9A4A12", 1L, "Cuadrilla Verde");
    }

    private static AltaOrdenSinSenalDTO altaDePoda() {
        return new AltaOrdenSinSenalDTO(new OrdenTrabajoRequestDTO("Podar el fresno", TipoTrabajo.PODA,
                OrigenOrden.RECLAMO_VECINAL, PrioridadOrden.ALTA, 3L), HECHO_EN);
    }

    // ===================== Cambio de estado =====================

    @Test
    void unCambioNuevoSeAnotaYSeAplica() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
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
        assertEquals(HECHO_EN, anotada.getValue().getHechoEn());
        assertEquals(ResultadoOperacion.APLICADA, anotada.getValue().getResultado());
        verify(manejadorTransacciones).commit(any());
    }

    @Test
    void laMismaComandaDosVecesNoCambiaElEstadoDeNuevo() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 7L, 3L, HECHO_EN)));
        when(ordenService.obtener(7L)).thenReturn(orden(7L, "En curso"));

        OrdenTrabajoDTO resultado = service.cambiarEstado(COMANDA, A_EN_CURSO, capataz);

        assertEquals("En curso", resultado.estadoNombre()); // responde cómo quedó la OT
        verify(ordenService, never()).cambiarEstado(any(), any(), any()); // pero no la vuelve a cambiar
        verify(operacionRepository, never()).saveAndFlush(any());
    }

    @Test
    void unNumeroQueYaUsoOtraPersonaSeRechaza() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 99L, 7L, 3L, HECHO_EN)));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        assertEquals("Ese número de operación ya se usó para otro cambio", error.getMessage());
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
        verify(ordenService, never()).obtener(any());
    }

    @Test
    void unNumeroQueYaSeUsoParaOtraOrdenSeRechaza() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 8L, 3L, HECHO_EN)));

        assertThrows(OperacionNoPermitidaException.class, () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));
        verify(ordenService, never()).cambiarEstado(any(), any(), any());
    }

    @Test
    void siElCambioNoSePuedeHacerSeDeshaceTambienLaAnotacion() {
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty());
        when(ordenService.cambiarEstado(7L, new CambioEstadoRequestDTO(3L), capataz))
                .thenThrow(new OperacionNoPermitidaException("No se puede pasar una orden de Finalizada a En curso"));

        assertThrows(OperacionNoPermitidaException.class, () -> service.cambiarEstado(COMANDA, A_EN_CURSO, capataz));

        // Todo junto o nada: la anotación de la comanda se deshace con el cambio que falló
        verify(manejadorTransacciones).rollback(any());
        verify(manejadorTransacciones, never()).commit(any());
    }

    @Test
    void siLaMismaComandaLlegaDosVecesAlMismoTiempoLaSegundaNoAplicaNada() {
        // La primera búsqueda no la encuentra (la otra todavía no terminó); al anotarla choca con la clave repetida
        when(operacionRepository.findById(COMANDA)).thenReturn(Optional.empty(), Optional.of(
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 7L, 3L, HECHO_EN)));
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
                OperacionSincronizada.cambioDeEstado(COMANDA, 5L, 7L, 3L, HECHO_EN)));

        assertThrows(OperacionNoPermitidaException.class, () -> service.crearOrden(COMANDA, altaDePoda(), capataz));
        verify(ordenService, never()).crear(any());
    }
}
