package com.faro.backend.controllers;

import com.faro.backend.dto.CuadrillaDTO;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.services.CuadrillaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CuadrillaController.class)
class CuadrillaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CuadrillaService service;

    @Test
    void listarDevuelve200ConLasCuadrillasRegistradas() throws Exception {
        when(service.listar()).thenReturn(List.of(
                new CuadrillaDTO(1L, "Cuadrilla Verde", 4, List.of(TipoTrabajo.PODA, TipoTrabajo.CORTE_DE_PASTO), true),
                new CuadrillaDTO(2L, "Cuadrilla Alumbrado", 2, List.of(TipoTrabajo.ALUMBRADO), false)
        ));

        mockMvc.perform(get("/api/cuadrillas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Cuadrilla Verde"))
                .andExpect(jsonPath("$[0].integrantes").value(4))
                .andExpect(jsonPath("$[0].disponible").value(true))
                .andExpect(jsonPath("$[0].tiposTrabajo[0]").value("PODA"))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].nombre").value("Cuadrilla Alumbrado"))
                .andExpect(jsonPath("$[1].disponible").value(false));
    }
}
