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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests del endpoint de reasignación (tarjeta 18): PATCH /api/ordenes-trabajo/{id}/reasignacion.
 * Solo se prueba el "mozo" (controller): el service es un mock, así que no hay base de datos.
 */
@WebMvcTest(OrdenTrabajoController.class)
class OrdenTrabajoControllerReasignacionTest {

    private static final String URL = "/api/ordenes-trabajo/7/reasignacion";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService service;

    @Test
    void reasignarExitosoResponde200ConLaCuadrillaNuevaYElMismoEstado() throws Exception {
        when(service.reasignarCuadrilla(7L, 21L)).thenReturn(
                new OrdenTrabajoDTO(7L, "Limpiar la plaza", TipoTrabajo.LIMPIEZA, OrigenOrden.RECLAMO_VECINAL,
                        PrioridadOrden.ALTA, 3L, "Plaza San Martín", LocalDateTime.of(2026, 10, 1, 10, 0),
                        3L, "En curso", "#9A4A12", 21L, "Cuadrilla Servicios Generales"));

        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cuadrillaId\": 21}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.estadoNombre").value("En curso"))
                .andExpect(jsonPath("$.cuadrillaId").value(21))
                .andExpect(jsonPath("$.cuadrillaNombre").value("Cuadrilla Servicios Generales"));

        // El mozo llevó el pedido a la reasignación, no a la asignación
        verify(service, never()).asignarCuadrilla(any(), any());
    }

    @Test
    void reasignarSinCuadrillaIdResponde400() throws Exception {
        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.cuadrillaId").exists());

        verify(service, never()).reasignarCuadrilla(any(), any());
    }

    @Test
    void reasignarNoPermitidoResponde409ConElMotivo() throws Exception {
        when(service.reasignarCuadrilla(7L, 20L))
                .thenThrow(new OperacionNoPermitidaException("La orden de trabajo ya está asignada a Cuadrilla Verde"));

        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cuadrillaId\": 20}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("La orden de trabajo ya está asignada a Cuadrilla Verde"));
    }

    @Test
    void reasignarOrdenNoEncontradaResponde404() throws Exception {
        when(service.reasignarCuadrilla(7L, 21L))
                .thenThrow(new RecursoNoEncontradoException("Orden de trabajo no encontrada"));

        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cuadrillaId\": 21}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("Orden de trabajo no encontrada"));
    }
}