package com.faro.backend.controllers;

import com.faro.backend.dto.EstadoOrdenDTO;
import com.faro.backend.services.EstadoOrdenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Test del EstadoOrdenController con MockMvc (el service es un mock). */
@WebMvcTest(EstadoOrdenController.class)
class EstadoOrdenControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EstadoOrdenService service;

    @Test
    void listarDevuelveLosEstadosConSusSiguientes() throws Exception {
        when(service.listar()).thenReturn(List.of(
                new EstadoOrdenDTO(1L, "Pendiente", "#566A73", true, false, List.of(2L, 3L, 5L)),
                new EstadoOrdenDTO(4L, "Finalizada", "#22633E", false, true, List.of())));

        mockMvc.perform(get("/api/estados-orden"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].nombre").value("Pendiente"))
                .andExpect(jsonPath("$[0].inicial").value(true))
                .andExpect(jsonPath("$[0].siguientes.length()").value(3))
                .andExpect(jsonPath("$[1].cierre").value(true))
                .andExpect(jsonPath("$[1].siguientes.length()").value(0));
    }
}
