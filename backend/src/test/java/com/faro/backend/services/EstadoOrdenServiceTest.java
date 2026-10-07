package com.faro.backend.services;

import com.faro.backend.dto.EstadoOrdenDTO;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.TransicionEstado;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/** Tests del EstadoOrdenService: que cada estado venga con sus "siguientes" bien armados. */
@ExtendWith(MockitoExtension.class)
class EstadoOrdenServiceTest {

    @Mock
    private EstadoOrdenRepository estadoRepository;

    @Mock
    private TransicionEstadoRepository transicionRepository;

    @InjectMocks
    private EstadoOrdenService service;

    private EstadoOrden estado(Long id, String nombre, boolean inicial, boolean cierre) {
        EstadoOrden estado = new EstadoOrden(nombre, "#000000", inicial, cierre, id.intValue());
        estado.setId(id);
        return estado;
    }

    @Test
    void listar_devuelveCadaEstadoConLosEstadosALosQuePuedePasar() {
        EstadoOrden pendiente = estado(1L, "Pendiente", true, false);
        EstadoOrden enCurso = estado(3L, "En curso", false, false);
        EstadoOrden finalizada = estado(4L, "Finalizada", false, true);
        when(estadoRepository.findAllByOrderByPosicionAsc()).thenReturn(List.of(pendiente, enCurso, finalizada));
        when(transicionRepository.findAll()).thenReturn(List.of(
                new TransicionEstado(pendiente, enCurso),
                new TransicionEstado(enCurso, finalizada)));

        List<EstadoOrdenDTO> resultado = service.listar();

        assertEquals(3, resultado.size());
        assertEquals("Pendiente", resultado.get(0).nombre());
        assertTrue(resultado.get(0).inicial());
        assertEquals(List.of(3L), resultado.get(0).siguientes()); // Pendiente -> En curso
        assertEquals(List.of(4L), resultado.get(1).siguientes()); // En curso -> Finalizada
        assertTrue(resultado.get(2).cierre());
        assertEquals(List.of(), resultado.get(2).siguientes());   // de Finalizada no se sale
    }
}
