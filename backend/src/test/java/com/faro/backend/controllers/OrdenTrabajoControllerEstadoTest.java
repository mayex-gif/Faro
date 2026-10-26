package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.models.Usuario;
import com.faro.backend.services.OrdenTrabajoService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests del PATCH /api/ordenes-trabajo/{id}/estado con MockMvc (el service es un mock).
 * Carga la seguridad real (@Import(SecurityConfig.class)) porque el controller le pasa al service
 * quién hizo el pedido (@AuthenticationPrincipal): user(...) simula a alguien que ya inició sesión.
 */
@WebMvcTest(OrdenTrabajoController.class)
@Import(SecurityConfig.class)
class OrdenTrabajoControllerEstadoTest {

    private static final String URL = "/api/ordenes-trabajo/7/estado";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService service;

    @Test
    void cambiarEstadoPermitidoResponde200ConElEstadoNuevo() throws Exception {
        when(service.cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(3L)), any(Usuario.class))).thenReturn(
                new OrdenTrabajoDTO(7L, "Podar el fresno", TipoTrabajo.PODA, OrigenOrden.ORDEN_DIRECTA,
                        PrioridadOrden.MEDIA, 3L, "Plaza San Martín", LocalDateTime.of(2026, 10, 1, 10, 0),
                        3L, "En curso", "#9A4A12"));

        mockMvc.perform(patch(URL).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content("{ \"estadoId\": 3 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoNombre").value("En curso"))
                .andExpect(jsonPath("$.estadoColor").value("#9A4A12"));
    }

    @Test
    void leAvisaAlServiceQuienHizoElPedido() throws Exception {
        mockMvc.perform(patch(URL).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content("{ \"estadoId\": 3 }"));

        // el usuario que llega al service es el del token: el capataz de la cuadrilla 1
        ArgumentCaptor<Usuario> quien = ArgumentCaptor.forClass(Usuario.class);
        verify(service).cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(3L)), quien.capture());
        assertEquals("capataz.verde@generalpaz.gob.ar", quien.getValue().getEmail());
        assertEquals(1L, quien.getValue().getCuadrillaId());
    }

    @Test
    void cambiarEstadoSinEstadoIdResponde400() throws Exception {
        mockMvc.perform(patch(URL).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.estadoId").value("El estado nuevo es obligatorio"));

        verifyNoInteractions(service);
    }

    @Test
    void cambiarEstadoNoPermitidoResponde409() throws Exception {
        when(service.cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(4L)), any(Usuario.class)))
                .thenThrow(new OperacionNoPermitidaException("No se puede pasar una orden de Pendiente a Finalizada"));

        mockMvc.perform(patch(URL).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content("{ \"estadoId\": 4 }"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("No se puede pasar una orden de Pendiente a Finalizada"));
    }

    @Test
    void unaOrdenDeOtraCuadrillaResponde403ConElMotivo() throws Exception {
        when(service.cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(3L)), any(Usuario.class)))
                .thenThrow(new SinPermisoException("Esta orden no es de tu cuadrilla"));

        mockMvc.perform(patch(URL).with(user(capataz(2L))).contentType(MediaType.APPLICATION_JSON).content("{ \"estadoId\": 3 }"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.estado").value(403))
                .andExpect(jsonPath("$.mensaje").value("Esta orden no es de tu cuadrilla"));
    }
}
