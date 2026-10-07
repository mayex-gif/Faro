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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServiceCuadrillaTest {

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
    private EventoOrdenRepository eventoRepository; // la bitácora (tarjeta 9): sin esto, el service recibiría null

    @InjectMocks
    private OrdenTrabajoService service;

    private EstadoOrden pendiente;
    private EstadoOrden enCurso;
    private EstadoOrden finalizada;
    private PuntoInfraestructura plaza;
    private Cuadrilla cuadrillaVerde;

    @BeforeEach
    void setUp() {
        pendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
        pendiente.setId(1L);

        enCurso = new EstadoOrden("En curso", "#9A4A12", false, false, 3);
        enCurso.setId(3L);

        finalizada = new EstadoOrden("Finalizada", "#22633E", false, true, 4);
        finalizada.setId(4L);

        plaza = new PuntoInfraestructura();
        plaza.setId(10L);
        plaza.setNombre("Plaza Central");

        cuadrillaVerde = new Cuadrilla("Cuadrilla Verde", 4, true,
                Set.of(TipoTrabajo.PODA, TipoTrabajo.CORTE_DE_PASTO));
        cuadrillaVerde.setId(20L);
    }

    private OrdenTrabajo ordenPendiente(Long id, TipoTrabajo tipo) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(id);
        orden.setDescripcion("Trabajo #" + id);
        orden.setTipo(tipo);
        orden.setOrigen(OrigenOrden.RECLAMO_VECINAL);
        orden.setPrioridad(PrioridadOrden.ALTA);
        orden.setLugar(plaza);
        orden.setEstado(pendiente);
        return orden;
    }

    @Test
    void asignarCuadrillaExitosaPasaAEnCursoYGuardaCuadrilla() {
        OrdenTrabajo orden = ordenPendiente(1L, TipoTrabajo.PODA);

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(cuadrillaVerde));
        when(transicionRepository.findByOrigenId(1L))
                .thenReturn(List.of(new TransicionEstado(pendiente, enCurso)));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> inv.getArgument(0));

        OrdenTrabajoDTO resultado = service.asignarCuadrilla(1L, 20L);

        assertNotNull(resultado);
        assertEquals(20L, resultado.cuadrillaId());
        assertEquals("Cuadrilla Verde", resultado.cuadrillaNombre());
        assertEquals("En curso", resultado.estadoNombre());
        assertEquals(3L, resultado.estadoId());
        assertSame(cuadrillaVerde, orden.getCuadrilla());
        assertSame(enCurso, orden.getEstado());
    }

    @Test
    void asignarMultiplesOrdenesALaMismaCuadrillaPermitido() {
        OrdenTrabajo orden1 = ordenPendiente(1L, TipoTrabajo.PODA);
        OrdenTrabajo orden2 = ordenPendiente(2L, TipoTrabajo.CORTE_DE_PASTO);

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden1));
        when(ordenRepository.findById(2L)).thenReturn(Optional.of(orden2));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(cuadrillaVerde));
        when(transicionRepository.findByOrigenId(1L))
                .thenReturn(List.of(new TransicionEstado(pendiente, enCurso)));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> inv.getArgument(0));

        OrdenTrabajoDTO dto1 = service.asignarCuadrilla(1L, 20L);
        OrdenTrabajoDTO dto2 = service.asignarCuadrilla(2L, 20L);

        assertEquals(20L, dto1.cuadrillaId());
        assertEquals(20L, dto2.cuadrillaId());
        assertEquals("En curso", dto1.estadoNombre());
        assertEquals("En curso", dto2.estadoNombre());
    }

    @Test
    void asignarOrdenNoExistenteLanzaRecursoNoEncontrado() {
        when(ordenRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> service.asignarCuadrilla(99L, 20L));
    }

    @Test
    void asignarOrdenYaNoPendienteLanzaOperacionNoPermitida() {
        OrdenTrabajo orden = ordenPendiente(1L, TipoTrabajo.PODA);
        orden.setEstado(enCurso); // ya está en curso, no pendiente

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));

        OperacionNoPermitidaException ex = assertThrows(
                OperacionNoPermitidaException.class,
                () -> service.asignarCuadrilla(1L, 20L)
        );
        assertTrue(ex.getMessage().contains("ya no está pendiente"));
    }

    @Test
    void asignarCuadrillaNoExistenteLanzaRecursoNoEncontrado() {
        OrdenTrabajo orden = ordenPendiente(1L, TipoTrabajo.PODA);

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> service.asignarCuadrilla(1L, 99L));
    }

    @Test
    void asignarCuadrillaNoDisponibleLanzaOperacionNoPermitida() {
        OrdenTrabajo orden = ordenPendiente(1L, TipoTrabajo.PODA);
        cuadrillaVerde.setDisponible(false); // fuera de servicio

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(cuadrillaVerde));

        OperacionNoPermitidaException ex = assertThrows(
                OperacionNoPermitidaException.class,
                () -> service.asignarCuadrilla(1L, 20L)
        );
        assertTrue(ex.getMessage().contains("no se encuentra disponible"));
    }

    @Test
    void asignarCuadrillaQueNoRealizaEseTipoDeTrabajoLanzaOperacionNoPermitida() {
        // Orden de alumbrado, cuadrilla solo hace poda y pasto
        OrdenTrabajo orden = ordenPendiente(1L, TipoTrabajo.ALUMBRADO);

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(cuadrillaVerde));

        OperacionNoPermitidaException ex = assertThrows(
                OperacionNoPermitidaException.class,
                () -> service.asignarCuadrilla(1L, 20L)
        );
        assertTrue(ex.getMessage().contains("no realiza trabajos de tipo ALUMBRADO"));
    }

    @Test
    void asignarSinTransicionEnCursoUsaPrimerEstadoNoCierre() {
        EstadoOrden planificada = new EstadoOrden("Planificada", "#086C80", false, false, 2);
        planificada.setId(2L);

        OrdenTrabajo orden = ordenPendiente(1L, TipoTrabajo.PODA);

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(cuadrillaVerde));
        // Solo hay transición a "Planificada" (no a "En curso")
        when(transicionRepository.findByOrigenId(1L))
                .thenReturn(List.of(new TransicionEstado(pendiente, planificada)));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> inv.getArgument(0));

        OrdenTrabajoDTO resultado = service.asignarCuadrilla(1L, 20L);

        assertEquals("Planificada", resultado.estadoNombre());
    }
}