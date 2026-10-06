package com.faro.backend.controllers;

import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.services.OrdenTrabajoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrdenTrabajoController.class)
class OrdenTrabajoControllerCuadrillaTest {

    private static final String URL = "/api/ordenes-trabajo/7/cuadrilla";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService service;

    @Test
    void asignarCuadrillaExitosaResponde200ConDTOActualizado() throws Exception {
        when(service.asignarCuadrilla(7L, 20L)).thenReturn(
                new OrdenTrabajoDTO(7L, "Podar el fresno", TipoTrabajo.PODA, OrigenOrden.ORDEN_DIRECTA,
                        PrioridadOrden.MEDIA, 3L, "Plaza San Martín", LocalDateTime.of(2026, 10, 1, 10, 0),
                        3L, "En curso", "#9A4A12", 20L, "Cuadrilla Verde"));

        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cuadrillaId\": 20}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.estadoNombre").value("En curso"))
                .andExpect(jsonPath("$.cuadrillaId").value(20))
                .andExpect(jsonPath("$.cuadrillaNombre").value("Cuadrilla Verde"));
    }

    @Test
    void asignarCuadrillaSinCuadrillaIdResponde400() throws Exception {
        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.cuadrillaId").exists());
    }

    @Test
    void asignarCuadrillaNoPermitidaResponde409() throws Exception {
        when(service.asignarCuadrilla(7L, 20L))
                .thenThrow(new OperacionNoPermitidaException("La cuadrilla Cuadrilla Verde no se encuentra disponible"));

        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cuadrillaId\": 20}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("La cuadrilla Cuadrilla Verde no se encuentra disponible"));
    }

    @Test
    void asignarCuadrillaNoEncontradaResponde404() throws Exception {
        when(service.asignarCuadrilla(7L, 99L))
                .thenThrow(new RecursoNoEncontradoException("Cuadrilla no encontrada"));

        mockMvc.perform(patch("/api/ordenes-trabajo/7/cuadrilla")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cuadrillaId\": 99}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("Cuadrilla no encontrada"));
    }
}
