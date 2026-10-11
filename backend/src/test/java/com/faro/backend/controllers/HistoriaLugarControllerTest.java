package com.faro.backend.controllers;

import com.faro.backend.dto.EventoHistoriaDTO;
import com.faro.backend.dto.HistoriaLugarDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.services.HistoriaLugarService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Tests del GET /api/infraestructura/{id}/historia con MockMvc (el service es un mock). */
@WebMvcTest(HistoriaLugarController.class)
class HistoriaLugarControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HistoriaLugarService service;

    @Test
    void lugarExistenteResponde200ConSusDatosResumenYEventos() throws Exception {
        EventoHistoriaDTO finalizada = new EventoHistoriaDTO(LocalDateTime.of(2026, 10, 4, 18, 0),
                "CAMBIO_ESTADO", 10L, "Podar el fresno", TipoTrabajo.PODA, null, null,
                "En curso", "Finalizada", "#22633E", true, null);
        EventoHistoriaDTO creada = new EventoHistoriaDTO(LocalDateTime.of(2026, 10, 1, 9, 0),
                "ORDEN_CREADA", 10L, "Podar el fresno", TipoTrabajo.PODA,
                OrigenOrden.RECLAMO_VECINAL, PrioridadOrden.ALTA, null, null, null, false, null);
        when(service.obtenerHistoria(3L)).thenReturn(new HistoriaLugarDTO(3L, "Plaza San Martín",
                "ESPACIO_VERDE", "Juegos y bancos", true, 1, 0, 1, List.of(finalizada, creada)));

        mockMvc.perform(get("/api/infraestructura/3/historia"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Plaza San Martín"))
                .andExpect(jsonPath("$.totalOrdenes").value(1))
                .andExpect(jsonPath("$.ordenesCerradas").value(1))
                .andExpect(jsonPath("$.eventos.length()").value(2))
                .andExpect(jsonPath("$.eventos[0].tipo").value("CAMBIO_ESTADO"))
                .andExpect(jsonPath("$.eventos[0].fecha").value("2026-10-04T18:00:00"))
                .andExpect(jsonPath("$.eventos[0].estadoNuevo").value("Finalizada"))
                .andExpect(jsonPath("$.eventos[0].cierre").value(true))
                .andExpect(jsonPath("$.eventos[1].tipo").value("ORDEN_CREADA"))
                .andExpect(jsonPath("$.eventos[1].origen").value("RECLAMO_VECINAL"));
    }

    @Test
    void lugarInexistenteResponde404ConMensaje() throws Exception {
        when(service.obtenerHistoria(99L)).thenThrow(new RecursoNoEncontradoException("Lugar no encontrado"));

        mockMvc.perform(get("/api/infraestructura/99/historia"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andExpect(jsonPath("$.mensaje").value("Lugar no encontrado"));
    }
}