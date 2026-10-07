package com.faro.backend.config;

import com.faro.backend.models.Cuadrilla;
import com.faro.backend.repositories.CuadrillaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InicializadorCuadrillasTest {

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @InjectMocks
    private InicializadorCuadrillas inicializador;

    @Test
    @SuppressWarnings("unchecked")
    void conTablaVacia_cargaLasCuadrillasPorDefecto() {
        when(cuadrillaRepository.count()).thenReturn(0L);

        inicializador.run();

        ArgumentCaptor<List<Cuadrilla>> captor = ArgumentCaptor.forClass(List.class);
        verify(cuadrillaRepository).saveAll(captor.capture());
        assertEquals(4, captor.getValue().size());
        assertEquals("Cuadrilla Verde", captor.getValue().get(0).getNombre());
    }

    @Test
    void conCuadrillasExistentes_noInsertaNada() {
        when(cuadrillaRepository.count()).thenReturn(4L);

        inicializador.run();

        verify(cuadrillaRepository, never()).saveAll(any());
    }
}
