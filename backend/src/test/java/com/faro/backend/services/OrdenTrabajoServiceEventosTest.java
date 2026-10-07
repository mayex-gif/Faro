package com.faro.backend.services;

import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests de la bitácora (tarjeta 9): cada vez que una OT cambia de estado o se le asigna
 * una cuadrilla, el service tiene que anotar un EventoOrden con los datos correctos.
 * Todos los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServiceEventosTest {

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

    // ===================== Ayudantes =====================

    private EstadoOrden estado(Long id, String nombre, boolean inicial) {
        EstadoOrden estado = new EstadoOrden(nombre, "#000000", inicial, false, id.intValue());
        estado.setId(id);
        return estado;
    }

    private final EstadoOrden pendiente = estado(1L, "Pendiente", true);
    private final EstadoOrden planificada = estado(2L, "Planificada", false);
    private final EstadoOrden enCurso = estado(3L, "En curso", false);

    private OrdenTrabajo ordenEn(EstadoOrden estado) {
        PuntoInfraestructura plaza = new PuntoInfraestructura();
        plaza.setId(3L);
        plaza.setNombre("Plaza San Martín");

        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(7L);
        orden.setDescripcion("Podar el fresno");
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.RECLAMO_VECINAL);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(plaza);
        orden.setEstado(estado);
        return orden;
    }

    // Atrapa el EventoOrden que el service le pasó a eventoRepository.save(...)
    private EventoOrden eventoGuardado() {
        ArgumentCaptor<EventoOrden> captor = ArgumentCaptor.forClass(EventoOrden.class);
        verify(eventoRepository).save(captor.capture());
        return captor.getValue();
    }

    // ===================== CAMBIO DE ESTADO =====================

    @Test
    void cambiarEstado_anotaEnLaBitacoraDeQueEstadoAQueEstadoPaso() {
        OrdenTrabajo orden = ordenEn(pendiente);
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(orden));
        when(estadoRepository.findById(2L)).thenReturn(Optional.of(planificada));
        when(transicionRepository.existsByOrigenIdAndDestinoId(1L, 2L)).thenReturn(true);
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        service.cambiarEstado(7L, new CambioEstadoRequestDTO(2L));

        EventoOrden evento = eventoGuardado();
        assertEquals(TipoEventoOrden.CAMBIO_ESTADO, evento.getTipo());
        assertSame(orden, evento.getOrden());
        assertSame(pendiente, evento.getEstadoAnterior()); // el de ANTES, no el de ahora
        assertSame(planificada, evento.getEstadoNuevo());
        assertNull(evento.getCuadrilla());
    }

    @Test
    void cambiarEstado_noPermitido_noAnotaNadaEnLaBitacora() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenEn(pendiente)));
        when(estadoRepository.findById(3L)).thenReturn(Optional.of(enCurso));
        when(transicionRepository.existsByOrigenIdAndDestinoId(1L, 3L)).thenReturn(false); // NO hay flecha

        assertThrows(OperacionNoPermitidaException.class,
                () -> service.cambiarEstado(7L, new CambioEstadoRequestDTO(3L)));

        verify(eventoRepository, never()).save(any());
    }

    // ===================== ASIGNACIÓN DE CUADRILLA =====================

    @Test
    void asignarCuadrilla_anotaLaCuadrillaYElCambioDeEstado() {
        OrdenTrabajo orden = ordenEn(pendiente);
        Cuadrilla verde = new Cuadrilla("Cuadrilla Verde", 4, true, Set.of(TipoTrabajo.PODA));
        verde.setId(20L);
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(orden));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(verde));
        when(transicionRepository.findByOrigenId(1L)).thenReturn(List.of(new TransicionEstado(pendiente, enCurso)));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        service.asignarCuadrilla(7L, 20L);

        EventoOrden evento = eventoGuardado();
        assertEquals(TipoEventoOrden.CUADRILLA_ASIGNADA, evento.getTipo());
        assertSame(orden, evento.getOrden());
        assertSame(verde, evento.getCuadrilla());
        assertSame(pendiente, evento.getEstadoAnterior());
        assertSame(enCurso, evento.getEstadoNuevo());
    }

    @Test
    void asignarCuadrilla_noPermitida_noAnotaNadaEnLaBitacora() {
        OrdenTrabajo orden = ordenEn(enCurso); // ya no está pendiente
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(orden));

        assertThrows(OperacionNoPermitidaException.class, () -> service.asignarCuadrilla(7L, 20L));

        verify(eventoRepository, never()).save(any());
    }
}