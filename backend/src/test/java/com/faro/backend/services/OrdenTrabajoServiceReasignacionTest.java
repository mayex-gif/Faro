package com.faro.backend.services;

import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests de la reasignación (tarjeta 18): pasar una OT que ya tiene cuadrilla a otra cuadrilla.
 * Todos los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServiceReasignacionTest {

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Mock
    private PuntoInfraestructuraRepository lugarRepository;

    @Mock
    private EstadoOrdenRepository estadoRepository;

    @Mock
    private TransicionEstadoRepository transicionRepository;

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @Mock
    private EventoOrdenRepository eventoRepository;

    @InjectMocks
    private OrdenTrabajoService service;

    private EstadoOrden enCurso;
    private EstadoOrden finalizada;
    private PuntoInfraestructura plaza;
    private Cuadrilla verde;      // hace PODA, CORTE_DE_PASTO y LIMPIEZA
    private Cuadrilla servicios;  // hace OTRO y LIMPIEZA

    @BeforeEach
    void setUp() {
        enCurso = new EstadoOrden("En curso", "#9A4A12", false, false, 3);
        enCurso.setId(3L);

        finalizada = new EstadoOrden("Finalizada", "#22633E", false, true, 4);
        finalizada.setId(4L);

        plaza = new PuntoInfraestructura();
        plaza.setId(10L);
        plaza.setNombre("Plaza Central");

        verde = new Cuadrilla("Cuadrilla Verde", 4, true,
                Set.of(TipoTrabajo.PODA, TipoTrabajo.CORTE_DE_PASTO, TipoTrabajo.LIMPIEZA));
        verde.setId(20L);

        servicios = new Cuadrilla("Cuadrilla Servicios Generales", 3, true,
                Set.of(TipoTrabajo.OTRO, TipoTrabajo.LIMPIEZA));
        servicios.setId(21L);
    }

    // Una OT de limpieza "En curso" que tiene la Cuadrilla Verde
    private OrdenTrabajo ordenEnCursoConVerde() {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(1L);
        orden.setDescripcion("Limpiar la plaza");
        orden.setTipo(TipoTrabajo.LIMPIEZA);
        orden.setOrigen(OrigenOrden.RECLAMO_VECINAL);
        orden.setPrioridad(PrioridadOrden.ALTA);
        orden.setLugar(plaza);
        orden.setEstado(enCurso);
        orden.setCuadrilla(verde);
        return orden;
    }

    // Verifica que no se guardó nada: ni la OT ni un renglón en la bitácora
    private void verificarQueNoSeGuardoNada() {
        verify(ordenRepository, never()).save(any());
        verify(eventoRepository, never()).save(any());
    }

    // ===================== Camino feliz =====================

    @Test
    void reasignarCambiaLaCuadrillaYNoCambiaElEstado() {
        OrdenTrabajo orden = ordenEnCursoConVerde();
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(21L)).thenReturn(Optional.of(servicios));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> inv.getArgument(0));

        OrdenTrabajoDTO resultado = service.reasignarCuadrilla(1L, 21L);

        assertEquals(21L, resultado.cuadrillaId());
        assertEquals("Cuadrilla Servicios Generales", resultado.cuadrillaNombre());
        assertEquals("En curso", resultado.estadoNombre()); // el estado no se movió
        assertSame(servicios, orden.getCuadrilla());
        assertSame(enCurso, orden.getEstado());
        verify(ordenRepository).save(orden);
    }

    @Test
    void reasignarAnotaEnLaBitacoraLaCuadrillaAnteriorYLaNueva() {
        OrdenTrabajo orden = ordenEnCursoConVerde();
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(21L)).thenReturn(Optional.of(servicios));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> inv.getArgument(0));

        service.reasignarCuadrilla(1L, 21L);

        // El ArgumentCaptor "atrapa" el evento que el service le pasó a la bitácora para revisarlo
        ArgumentCaptor<EventoOrden> captor = ArgumentCaptor.forClass(EventoOrden.class);
        verify(eventoRepository).save(captor.capture());
        EventoOrden evento = captor.getValue();
        assertEquals(TipoEventoOrden.CUADRILLA_REASIGNADA, evento.getTipo());
        assertSame(orden, evento.getOrden());
        assertSame(verde, evento.getCuadrillaAnterior());
        assertSame(servicios, evento.getCuadrilla());
        assertSame(enCurso, evento.getEstadoAnterior());
        assertSame(enCurso, evento.getEstadoNuevo());
    }

    // ===================== Errores (no se guarda nada) =====================

    @Test
    void reasignarOrdenNoExistenteLanzaRecursoNoEncontrado() {
        when(ordenRepository.findById(99L)).thenReturn(Optional.empty());

        RecursoNoEncontradoException error = assertThrows(RecursoNoEncontradoException.class,
                () -> service.reasignarCuadrilla(99L, 21L));

        assertEquals("Orden de trabajo no encontrada", error.getMessage());
        verificarQueNoSeGuardoNada();
    }

    @Test
    void reasignarOrdenCerradaLanzaOperacionNoPermitida() {
        OrdenTrabajo orden = ordenEnCursoConVerde();
        orden.setEstado(finalizada);
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.reasignarCuadrilla(1L, 21L));

        assertEquals("No se puede reasignar una orden en estado Finalizada", error.getMessage());
        verificarQueNoSeGuardoNada();
    }

    @Test
    void reasignarOrdenSinCuadrillaLanzaOperacionNoPermitida() {
        OrdenTrabajo orden = ordenEnCursoConVerde();
        orden.setCuadrilla(null);
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.reasignarCuadrilla(1L, 21L));

        assertEquals("La orden de trabajo no tiene una cuadrilla asignada", error.getMessage());
        verificarQueNoSeGuardoNada();
    }

    @Test
    void reasignarACuadrillaNoExistenteLanzaRecursoNoEncontrado() {
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(ordenEnCursoConVerde()));
        when(cuadrillaRepository.findById(99L)).thenReturn(Optional.empty());

        RecursoNoEncontradoException error = assertThrows(RecursoNoEncontradoException.class,
                () -> service.reasignarCuadrilla(1L, 99L));

        assertEquals("Cuadrilla no encontrada", error.getMessage());
        verificarQueNoSeGuardoNada();
    }

    @Test
    void reasignarALaMismaCuadrillaLanzaOperacionNoPermitida() {
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(ordenEnCursoConVerde()));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(verde));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.reasignarCuadrilla(1L, 20L));

        assertEquals("La orden de trabajo ya está asignada a Cuadrilla Verde", error.getMessage());
        verificarQueNoSeGuardoNada();
    }

    @Test
    void reasignarACuadrillaNoDisponibleLanzaOperacionNoPermitida() {
        servicios.setDisponible(false);
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(ordenEnCursoConVerde()));
        when(cuadrillaRepository.findById(21L)).thenReturn(Optional.of(servicios));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.reasignarCuadrilla(1L, 21L));

        assertEquals("La cuadrilla Cuadrilla Servicios Generales no se encuentra disponible", error.getMessage());
        verificarQueNoSeGuardoNada();
    }

    @Test
    void reasignarACuadrillaQueNoHaceEseTipoDeTrabajoLanzaOperacionNoPermitida() {
        OrdenTrabajo orden = ordenEnCursoConVerde();
        orden.setTipo(TipoTrabajo.PODA); // Servicios Generales no poda
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(21L)).thenReturn(Optional.of(servicios));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.reasignarCuadrilla(1L, 21L));

        assertEquals("La cuadrilla Cuadrilla Servicios Generales no realiza trabajos de tipo PODA", error.getMessage());
        verificarQueNoSeGuardoNada();
    }
}