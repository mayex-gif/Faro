package com.faro.backend.services;

import com.faro.backend.dto.EventoHistoriaDTO;
import com.faro.backend.dto.HistoriaLugarDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
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
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Tests del "historiador": que junte las OT y la bitácora de un lugar
 * en una sola línea de tiempo, ordenada, con su resumen.
 * Todos los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class HistoriaLugarServiceTest {

    @Mock
    private PuntoInfraestructuraRepository lugarRepository;

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Mock
    private EventoOrdenRepository eventoRepository;

    @InjectMocks
    private HistoriaLugarService service;

    // ===================== Ayudantes =====================

    private final EstadoOrden pendiente = estado(1L, "Pendiente", "#566A73", false);
    private final EstadoOrden enCurso = estado(3L, "En curso", "#9A4A12", false);
    private final EstadoOrden finalizada = estado(4L, "Finalizada", "#22633E", true);

    private EstadoOrden estado(Long id, String nombre, String color, boolean cierre) {
        EstadoOrden estado = new EstadoOrden(nombre, color, false, cierre, id.intValue());
        estado.setId(id);
        return estado;
    }

    private PuntoInfraestructura plaza() {
        PuntoInfraestructura plaza = new PuntoInfraestructura();
        plaza.setId(3L);
        plaza.setNombre("Plaza San Martín");
        plaza.setTipo("ESPACIO_VERDE");
        plaza.setDatosTecnicos("Juegos y bancos");
        plaza.setEstadoOperativo(true);
        return plaza;
    }

    private OrdenTrabajo orden(Long id, String descripcion, EstadoOrden estado, LocalDateTime creada) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(id);
        orden.setDescripcion(descripcion);
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.RECLAMO_VECINAL);
        orden.setPrioridad(PrioridadOrden.ALTA);
        orden.setEstado(estado);
        orden.setFechaCreacion(creada);
        return orden;
    }

    private EventoOrden conFecha(EventoOrden evento, LocalDateTime fecha) {
        evento.setFecha(fecha);
        return evento;
    }

    private LocalDateTime dia(int dia, int hora) {
        return LocalDateTime.of(2026, 10, dia, hora, 0);
    }

    // ===================== Tests =====================

    @Test
    void lugarInexistente_lanzaNoEncontrado() {
        when(lugarRepository.findById(99L)).thenReturn(Optional.empty());

        RecursoNoEncontradoException error = assertThrows(RecursoNoEncontradoException.class,
                () -> service.obtenerHistoria(99L));

        assertEquals("Lugar no encontrado", error.getMessage());
        verifyNoInteractions(ordenRepository, eventoRepository);
    }

    @Test
    void lugarSinOrdenes_devuelveSusDatosYUnaHistoriaVacia() {
        when(lugarRepository.findById(3L)).thenReturn(Optional.of(plaza()));
        when(ordenRepository.findByLugarIdOrderByFechaCreacionDesc(3L)).thenReturn(List.of());
        when(eventoRepository.findByOrdenLugarIdOrderByFechaDesc(3L)).thenReturn(List.of());

        HistoriaLugarDTO historia = service.obtenerHistoria(3L);

        assertEquals(3L, historia.lugarId());
        assertEquals("Plaza San Martín", historia.nombre());
        assertEquals("ESPACIO_VERDE", historia.tipo());
        assertEquals("Juegos y bancos", historia.datosTecnicos());
        assertTrue(historia.estadoOperativo());
        assertEquals(0, historia.totalOrdenes());
        assertEquals(0, historia.ordenesAbiertas());
        assertEquals(0, historia.ordenesCerradas());
        assertTrue(historia.eventos().isEmpty());
    }

    @Test
    void juntaOrdenesYBitacoraEnUnaSolaLineaDeTiempoDelMasNuevoAlMasViejo() {
        // OT 10: creada el día 1, asignada el día 2, finalizada el día 4
        OrdenTrabajo poda = orden(10L, "Podar el fresno", finalizada, dia(1, 9));
        // OT 11: creada el día 3, sigue pendiente
        OrdenTrabajo pasto = orden(11L, "Cortar el pasto", pendiente, dia(3, 9));
        Cuadrilla verde = new Cuadrilla("Cuadrilla Verde", 4, true, Set.of(TipoTrabajo.PODA));

        when(lugarRepository.findById(3L)).thenReturn(Optional.of(plaza()));
        when(ordenRepository.findByLugarIdOrderByFechaCreacionDesc(3L)).thenReturn(List.of(pasto, poda));
        when(eventoRepository.findByOrdenLugarIdOrderByFechaDesc(3L)).thenReturn(List.of(
                conFecha(EventoOrden.cambioDeEstado(poda, enCurso, finalizada), dia(4, 18)),
                conFecha(EventoOrden.asignacionDeCuadrilla(poda, verde, pendiente, enCurso), dia(2, 8))
        ));

        HistoriaLugarDTO historia = service.obtenerHistoria(3L);

        // El resumen: 2 OT, 1 abierta (pasto) y 1 cerrada (poda)
        assertEquals(2, historia.totalOrdenes());
        assertEquals(1, historia.ordenesAbiertas());
        assertEquals(1, historia.ordenesCerradas());

        // Los 4 eventos, intercalados por fecha
        List<EventoHistoriaDTO> eventos = historia.eventos();
        assertEquals(4, eventos.size());
        assertEquals(List.of(dia(4, 18), dia(3, 9), dia(2, 8), dia(1, 9)),
                eventos.stream().map(EventoHistoriaDTO::fecha).toList());
        assertEquals(List.of("CAMBIO_ESTADO", "ORDEN_CREADA", "CUADRILLA_ASIGNADA", "ORDEN_CREADA"),
                eventos.stream().map(EventoHistoriaDTO::tipo).toList());
    }

    @Test
    void cadaTipoDeEventoTraeSusDatos() {
        OrdenTrabajo poda = orden(10L, "Podar el fresno", finalizada, dia(1, 9));
        Cuadrilla verde = new Cuadrilla("Cuadrilla Verde", 4, true, Set.of(TipoTrabajo.PODA));

        when(lugarRepository.findById(3L)).thenReturn(Optional.of(plaza()));
        when(ordenRepository.findByLugarIdOrderByFechaCreacionDesc(3L)).thenReturn(List.of(poda));
        when(eventoRepository.findByOrdenLugarIdOrderByFechaDesc(3L)).thenReturn(List.of(
                conFecha(EventoOrden.cambioDeEstado(poda, enCurso, finalizada), dia(4, 18)),
                conFecha(EventoOrden.asignacionDeCuadrilla(poda, verde, pendiente, enCurso), dia(2, 8))
        ));

        List<EventoHistoriaDTO> eventos = service.obtenerHistoria(3L).eventos();
        EventoHistoriaDTO finalizacion = eventos.get(0);
        EventoHistoriaDTO asignacion = eventos.get(1);
        EventoHistoriaDTO creacion = eventos.get(2);

        // Cambio de estado a un estado de cierre
        assertEquals(10L, finalizacion.ordenId());
        assertEquals("Podar el fresno", finalizacion.ordenDescripcion());
        assertEquals("En curso", finalizacion.estadoAnterior());
        assertEquals("Finalizada", finalizacion.estadoNuevo());
        assertEquals("#22633E", finalizacion.estadoNuevoColor());
        assertTrue(finalizacion.cierre());
        assertNull(finalizacion.cuadrilla());

        // Asignación de cuadrilla
        assertEquals("Cuadrilla Verde", asignacion.cuadrilla());
        assertEquals("Pendiente", asignacion.estadoAnterior());
        assertEquals("En curso", asignacion.estadoNuevo());
        assertFalse(asignacion.cierre());

        // Creación de la OT: trae tipo, origen y prioridad, pero no estados
        assertEquals("ORDEN_CREADA", creacion.tipo());
        assertEquals(TipoTrabajo.PODA, creacion.tipoTrabajo());
        assertEquals(OrigenOrden.RECLAMO_VECINAL, creacion.origen());
        assertEquals(PrioridadOrden.ALTA, creacion.prioridad());
        assertNull(creacion.estadoNuevo());
        assertFalse(creacion.cierre());
    }

    @Test
    void siDosEventosTienenLaMismaFecha_laCreacionVaDebajo() {
        OrdenTrabajo poda = orden(10L, "Podar el fresno", enCurso, dia(1, 9));

        when(lugarRepository.findById(3L)).thenReturn(Optional.of(plaza()));
        when(ordenRepository.findByLugarIdOrderByFechaCreacionDesc(3L)).thenReturn(List.of(poda));
        when(eventoRepository.findByOrdenLugarIdOrderByFechaDesc(3L)).thenReturn(List.of(
                conFecha(EventoOrden.cambioDeEstado(poda, pendiente, enCurso), dia(1, 9)) // misma fecha
        ));

        List<EventoHistoriaDTO> eventos = service.obtenerHistoria(3L).eventos();

        assertEquals("CAMBIO_ESTADO", eventos.get(0).tipo());
        assertEquals("ORDEN_CREADA", eventos.get(1).tipo());
    }

    @Test
    void ordenSinEstado_cuentaComoAbierta() {
        OrdenTrabajo vieja = orden(10L, "OT de antes de los estados", null, dia(1, 9));

        when(lugarRepository.findById(3L)).thenReturn(Optional.of(plaza()));
        when(ordenRepository.findByLugarIdOrderByFechaCreacionDesc(3L)).thenReturn(List.of(vieja));
        when(eventoRepository.findByOrdenLugarIdOrderByFechaDesc(3L)).thenReturn(List.of());

        HistoriaLugarDTO historia = service.obtenerHistoria(3L);

        assertEquals(1, historia.ordenesAbiertas());
        assertEquals(0, historia.ordenesCerradas());
    }
}