package com.faro.backend.services;

import com.faro.backend.dto.CuadrillaDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.repositories.CuadrillaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CuadrillaServiceTest {

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @InjectMocks
    private CuadrillaService service;

    @Test
    void listarDevuelveTodasLasCuadrillasMapeadasADto() {
        Cuadrilla c1 = new Cuadrilla("Cuadrilla Verde", 4, true, Set.of(TipoTrabajo.PODA, TipoTrabajo.CORTE_DE_PASTO));
        c1.setId(1L);
        Cuadrilla c2 = new Cuadrilla("Cuadrilla Alumbrado", 2, false, Set.of(TipoTrabajo.ALUMBRADO));
        c2.setId(2L);

        when(cuadrillaRepository.findAll(any(Sort.class))).thenReturn(List.of(c1, c2));

        List<CuadrillaDTO> resultado = service.listar();

        assertEquals(2, resultado.size());
        assertEquals("Cuadrilla Verde", resultado.get(0).nombre());
        assertTrue(resultado.get(0).disponible());
        assertEquals(2, resultado.get(0).tiposTrabajo().size());

        assertEquals("Cuadrilla Alumbrado", resultado.get(1).nombre());
        assertFalse(resultado.get(1).disponible());
    }

    @Test
    void buscarExistenteDevuelveLaCuadrilla() {
        Cuadrilla c = new Cuadrilla("Cuadrilla Vial", 5, true, Set.of(TipoTrabajo.BACHEO));
        c.setId(3L);
        when(cuadrillaRepository.findById(3L)).thenReturn(Optional.of(c));

        Cuadrilla resultado = service.buscar(3L);

        assertNotNull(resultado);
        assertEquals("Cuadrilla Vial", resultado.getNombre());
    }

    @Test
    void buscarInexistenteLanzaRecursoNoEncontrado() {
        when(cuadrillaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> service.buscar(99L));
    }
}
