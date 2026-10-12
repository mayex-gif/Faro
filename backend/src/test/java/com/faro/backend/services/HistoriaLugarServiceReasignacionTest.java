package com.faro.backend.services;

import com.faro.backend.dto.EventoHistoriaDTO;
import com.faro.backend.dto.HistoriaLugarDTO;
import com.faro.backend.models.*;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests del "historiador" con reasignaciones (tarjeta 18): que la línea de tiempo
 * muestre de qué cuadrilla a qué cuadrilla pasó la OT.
 * Todos los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class HistoriaLugarServiceReasignacionTest {

    @Mock
    private PuntoInfraestructuraRepository lugarRepository;

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Mock
    private EventoOrdenRepository eventoRepository;

    @InjectMocks
    private HistoriaLugarService service;

    @Test
    void laReasignacionMuestraLaCuadrillaAnteriorYLaNuevaSinCambiarElEstado() {
        PuntoInfraestructura parque = new PuntoInfraestructura();
        parque.setId(36L);
        parque.setNombre("Parque Sarmiento");

        EstadoOrden enCurso = new EstadoOrden("En curso", "#9A4A12", false, false, 3);
        enCurso.setId(3L);

        Cuadrilla verde = new Cuadrilla();
        verde.setNombre("Cuadrilla Verde");
        Cuadrilla servicios = new Cuadrilla();
        servicios.setNombre("Cuadrilla Servicios Generales");

        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(7L);
        orden.setDescripcion("Limpiar el parque");
        orden.setTipo(TipoTrabajo.LIMPIEZA);
        orden.setOrigen(OrigenOrden.PLAN_MANTENIMIENTO);
        orden.setPrioridad(PrioridadOrden.ALTA);
        orden.setLugar(parque);
        orden.setEstado(enCurso);
        orden.setCuadrilla(servicios);
        orden.setFechaCreacion(LocalDateTime.of(2026, 10, 11, 12, 0));

        // La OT estaba en curso con la Verde y pasó a Servicios Generales
        EventoOrden reasignacion = EventoOrden.reasignacionDeCuadrilla(orden, verde, servicios);
        reasignacion.setFecha(LocalDateTime.of(2026, 10, 11, 13, 5));

        when(lugarRepository.findById(36L)).thenReturn(Optional.of(parque));
        when(ordenRepository.findByLugarIdOrderByFechaCreacionDesc(36L)).thenReturn(List.of(orden));
        when(eventoRepository.findByOrdenLugarIdOrderByFechaDesc(36L)).thenReturn(List.of(reasignacion));

        HistoriaLugarDTO historia = service.obtenerHistoria(36L);

        // Primero la reasignación (es lo más nuevo) y abajo la creación de la OT
        assertEquals(2, historia.eventos().size());
        EventoHistoriaDTO evento = historia.eventos().get(0);
        assertEquals("CUADRILLA_REASIGNADA", evento.tipo());
        assertEquals(7L, evento.ordenId());
        assertEquals("Cuadrilla Servicios Generales", evento.cuadrilla());
        assertEquals("Cuadrilla Verde", evento.cuadrillaAnterior());
        assertEquals("En curso", evento.estadoAnterior());
        assertEquals("En curso", evento.estadoNuevo());
        assertEquals("#9A4A12", evento.estadoNuevoColor());
        assertFalse(evento.cierre());

        // La creación de la OT no tiene cuadrilla anterior
        assertNull(historia.eventos().get(1).cuadrillaAnterior());
    }
}