package com.faro.backend.controllers;

import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Tests del PATCH /api/ordenes-trabajo/{id}/estado con MockMvc (el service es un mock). */
@WebMvcTest(OrdenTrabajoController.class)
class OrdenTrabajoControllerEstadoTest {

    private static final String URL = "/api/ordenes-trabajo/7/estado";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService service;

    @Test
    void cambiarEstadoPermitidoResponde200ConElEstadoNuevo() throws Exception {
        when(service.cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(3L)))).thenReturn(
                new OrdenTrabajoDTO(7L, "Podar el fresno", TipoTrabajo.PODA, OrigenOrden.ORDEN_DIRECTA,
                        PrioridadOrden.MEDIA, 3L, "Plaza San Martín", LocalDateTime.of(2026, 10, 1, 10, 0),
                        3L, "En curso", "#9A4A12"));

        mockMvc.perform(patch(URL).contentType(MediaType.APPLICATION_JSON).content("{ \"estadoId\": 3 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoNombre").value("En curso"))
                .andExpect(jsonPath("$.estadoColor").value("#9A4A12"));
    }

    @Test
    void cambiarEstadoSinEstadoIdResponde400() throws Exception {
        mockMvc.perform(patch(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.estadoId").value("El estado nuevo es obligatorio"));

        verifyNoInteractions(service);
    }

    @Test
    void cambiarEstadoNoPermitidoResponde409() throws Exception {
        when(service.cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(4L))))
                .thenThrow(new OperacionNoPermitidaException("No se puede pasar una orden de Pendiente a Finalizada"));

        mockMvc.perform(patch(URL).contentType(MediaType.APPLICATION_JSON).content("{ \"estadoId\": 4 }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("No se puede pasar una orden de Pendiente a Finalizada"));
    }
}
