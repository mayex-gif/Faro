package com.faro.backend.config;

import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.TransicionEstado;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Tests del InicializadorEstados: qué carga al arrancar y qué NO toca. */
@ExtendWith(MockitoExtension.class)
class InicializadorEstadosTest {

    @Mock
    private EstadoOrdenRepository estadoRepository;

    @Mock
    private TransicionEstadoRepository transicionRepository;

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @InjectMocks
    private InicializadorEstados inicializador;

    @Test
    @SuppressWarnings("unchecked")
    void conLaTablaVacia_cargaLos5EstadosYLas8Transiciones() {
        when(estadoRepository.count()).thenReturn(0L);
        // save() devuelve lo mismo que recibe, como haría la base
        when(estadoRepository.save(any(EstadoOrden.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        when(ordenRepository.findByEstadoIsNull()).thenReturn(List.of());

        inicializador.run();

        ArgumentCaptor<EstadoOrden> estados = ArgumentCaptor.forClass(EstadoOrden.class);
        verify(estadoRepository, times(5)).save(estados.capture());
        assertEquals("Pendiente", estados.getAllValues().get(0).getNombre());
        assertTrue(estados.getAllValues().get(0).isInicial());
        // exactamente un estado inicial
        assertEquals(1, estados.getAllValues().stream().filter(EstadoOrden::isInicial).count());

        ArgumentCaptor<List<TransicionEstado>> transiciones = ArgumentCaptor.forClass(List.class);
        verify(transicionRepository).saveAll(transiciones.capture());
        assertEquals(8, transiciones.getValue().size());
    }

    @Test
    void conEstadosYaCargados_noLosToca() {
        when(estadoRepository.count()).thenReturn(5L);
        when(ordenRepository.findByEstadoIsNull()).thenReturn(List.of());

        inicializador.run();

        verify(estadoRepository, never()).save(any());
        verify(transicionRepository, never()).saveAll(any());
    }

    @Test
    void conOrdenesSinEstado_lesPoneElEstadoInicial() {
        EstadoOrden pendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
        OrdenTrabajo vieja1 = new OrdenTrabajo();
        OrdenTrabajo vieja2 = new OrdenTrabajo();
        when(estadoRepository.count()).thenReturn(5L);
        when(ordenRepository.findByEstadoIsNull()).thenReturn(List.of(vieja1, vieja2));
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.of(pendiente));

        inicializador.run();

        assertSame(pendiente, vieja1.getEstado());
        assertSame(pendiente, vieja2.getEstado());
        verify(ordenRepository).saveAll(List.of(vieja1, vieja2));
    }

    @Test
    void conOrdenesSinEstadoYSinEstadoInicial_lanzaError() {
        when(estadoRepository.count()).thenReturn(5L);
        when(ordenRepository.findByEstadoIsNull()).thenReturn(List.of(new OrdenTrabajo()));
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> inicializador.run());
        verify(ordenRepository, never()).saveAll(any());
    }
}
