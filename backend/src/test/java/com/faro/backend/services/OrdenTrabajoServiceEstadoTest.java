package com.faro.backend.services;

import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests del "árbitro": el cambio de estado de una OT y la regla de no editar OT cerradas.
 * Todos los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServiceEstadoTest {

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Mock
    private PuntoInfraestructuraRepository lugarRepository;

    @Mock
    private EstadoOrdenRepository estadoRepository;

    @Mock
    private TransicionEstadoRepository transicionRepository;

    @InjectMocks
    private OrdenTrabajoService service;

    // ===================== Ayudantes =====================

    private EstadoOrden estado(Long id, String nombre, boolean cierre) {
        EstadoOrden estado = new EstadoOrden(nombre, "#000000", false, cierre, id.intValue());
        estado.setId(id);
        return estado;
    }

    private OrdenTrabajo ordenEn(EstadoOrden estado) {
        PuntoInfraestructura plaza = new PuntoInfraestructura();
        plaza.setId(3L);
        plaza.setNombre("Plaza San Martín");

        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(7L);
        orden.setDescripcion("Podar el fresno");
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(plaza);
        orden.setEstado(estado);
        return orden;
    }

    private final EstadoOrden pendiente = estado(1L, "Pendiente", false);
    private final EstadoOrden enCurso = estado(3L, "En curso", false);
    private final EstadoOrden finalizada = estado(4L, "Finalizada", true);

    // ===================== CAMBIO DE ESTADO =====================

    @Test
    void cambiarEstado_conCaminoPermitido_cambiaYGuarda() {
        OrdenTrabajo orden = ordenEn(pendiente);
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(orden));
        when(estadoRepository.findById(3L)).thenReturn(Optional.of(enCurso));
        when(transicionRepository.existsByOrigenIdAndDestinoId(1L, 3L)).thenReturn(true); // hay flecha
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        OrdenTrabajoDTO resultado = service.cambiarEstado(7L, new CambioEstadoRequestDTO(3L));

        assertEquals("En curso", resultado.estadoNombre());
        assertSame(enCurso, orden.getEstado());
        verify(ordenRepository).save(orden);
    }

    @Test
    void cambiarEstado_sinCaminoPermitido_lanzaErrorYNoGuarda() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenEn(pendiente)));
        when(estadoRepository.findById(4L)).thenReturn(Optional.of(finalizada));
        when(transicionRepository.existsByOrigenIdAndDestinoId(1L, 4L)).thenReturn(false); // NO hay flecha

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.cambiarEstado(7L, new CambioEstadoRequestDTO(4L)));

        assertEquals("No se puede pasar una orden de Pendiente a Finalizada", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_ordenSinEstado_lanzaErrorYNoGuarda() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenEn(null)));
        when(estadoRepository.findById(3L)).thenReturn(Optional.of(enCurso));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.cambiarEstado(7L, new CambioEstadoRequestDTO(3L)));

        assertEquals("No se puede pasar una orden de sin estado a En curso", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_estadoInexistente_lanzaNoEncontrado() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenEn(pendiente)));
        when(estadoRepository.findById(99L)).thenReturn(Optional.empty());

        RecursoNoEncontradoException error = assertThrows(RecursoNoEncontradoException.class,
                () -> service.cambiarEstado(7L, new CambioEstadoRequestDTO(99L)));

        assertEquals("Estado no encontrado", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_ordenInexistente_lanzaNoEncontrado() {
        when(ordenRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class,
                () -> service.cambiarEstado(99L, new CambioEstadoRequestDTO(3L)));

        verify(ordenRepository, never()).save(any());
    }

    // ===================== REGLA: NO EDITAR OT CERRADAS =====================

    @Test
    void modificar_ordenEnEstadoDeCierre_lanzaErrorYNoGuarda() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenEn(finalizada)));
        OrdenTrabajoRequestDTO pedido = new OrdenTrabajoRequestDTO("Otra descripción", TipoTrabajo.PODA,
                OrigenOrden.ORDEN_DIRECTA, PrioridadOrden.ALTA, 3L);

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.modificar(7L, pedido));

        assertEquals("No se puede modificar una orden en estado Finalizada", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }
}
