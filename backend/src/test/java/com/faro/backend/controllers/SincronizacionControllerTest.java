package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.AltaOrdenSinSenalDTO;
import com.faro.backend.dto.CambioEstadoSinSenalDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.ConflictoSincronizacionException;
import com.faro.backend.exceptions.ConflictoSincronizacionException.Motivo;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.models.Usuario;
import com.faro.backend.services.SincronizacionService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de /api/sincronizacion con la seguridad real (@Import(SecurityConfig.class)); el service es un mock.
 * Cambios de estado: encargado y capataz. Altas de OT: encargado y mesa (igual que /api/ordenes-trabajo).
 */
@WebMvcTest(SincronizacionController.class)
@Import(SecurityConfig.class)
class SincronizacionControllerTest {

    private static final String COMANDA = "3f2b8c1e-7a4d-4e8b-9c1f-2a6d5e4b3c21";
    private static final String URL_ESTADO = "/api/sincronizacion/cambios-estado/" + COMANDA;
    private static final String URL_ALTA = "/api/sincronizacion/altas-orden/" + COMANDA;

    private static final String JSON_ESTADO = """
            { "ordenId": 7, "estadoId": 3, "estadoAnteriorId": 2, "hechoEn": "2026-10-26T10:32:00-03:00" }
            """;

    private static final String JSON_ALTA = """
            {
              "orden": {
                "descripcion": "Podar el fresno",
                "tipo": "PODA",
                "origen": "RECLAMO_VECINAL",
                "prioridad": "ALTA",
                "lugarId": 3
              },
              "hechoEn": "2026-10-26T10:32:00-03:00"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SincronizacionService service;

    private static OrdenTrabajoDTO orden(Long id, String estado) {
        return new OrdenTrabajoDTO(id, "Podar el fresno", TipoTrabajo.PODA, OrigenOrden.RECLAMO_VECINAL,
                PrioridadOrden.ALTA, 3L, "Plaza San Martín", LocalDateTime.of(2026, 10, 26, 11, 0), 3L, estado, "#9A4A12");
    }

    // ===================== Cambios de estado =====================

    @Test
    void elCapatazMandaUnCambioHechoSinSenal() throws Exception {
        when(service.cambiarEstado(eq(UUID.fromString(COMANDA)), any(), any(Usuario.class))).thenReturn(orden(7L, "En curso"));

        mockMvc.perform(put(URL_ESTADO).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoNombre").value("En curso"));

        ArgumentCaptor<CambioEstadoSinSenalDTO> pedido = ArgumentCaptor.forClass(CambioEstadoSinSenalDTO.class);
        ArgumentCaptor<Usuario> quien = ArgumentCaptor.forClass(Usuario.class);
        verify(service).cambiarEstado(eq(UUID.fromString(COMANDA)), pedido.capture(), quien.capture());
        assertEquals(7L, pedido.getValue().ordenId());
        assertEquals(3L, pedido.getValue().estadoId());
        assertEquals(2L, pedido.getValue().estadoAnteriorId());
        assertTrue(pedido.getValue().hechoEn().isEqual(OffsetDateTime.parse("2026-10-26T10:32:00-03:00")));
        assertEquals("capataz.verde@generalpaz.gob.ar", quien.getValue().getEmail()); // quién lo mandó sale del token
    }

    @Test
    void elEncargadoTambienPuedeMandarCambiosDeEstado() throws Exception {
        when(service.cambiarEstado(any(), any(), any())).thenReturn(orden(7L, "En curso"));

        mockMvc.perform(put(URL_ESTADO).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isOk());
    }

    @Test
    void laMesaNoPuedeMandarCambiosDeEstado() throws Exception {
        mockMvc.perform(put(URL_ESTADO).with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void sinSesionResponde401() throws Exception {
        mockMvc.perform(put(URL_ESTADO).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void sinElEstadoNuevoResponde400() throws Exception {
        mockMvc.perform(put(URL_ESTADO).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content("{ \"ordenId\": 7 }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.estadoId").value("El estado nuevo es obligatorio"));
        verifyNoInteractions(service);
    }

    @Test
    void unNumeroDeOperacionQueNoEsUnUuidResponde400() throws Exception {
        mockMvc.perform(put("/api/sincronizacion/cambios-estado/123").with(user(capataz(1L)))
                        .contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void unNumeroYaUsadoParaOtroCambioResponde409() throws Exception {
        when(service.cambiarEstado(any(), any(), any()))
                .thenThrow(new OperacionNoPermitidaException("Ese número de operación ya se usó para otro cambio"));

        mockMvc.perform(put(URL_ESTADO).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ese número de operación ya se usó para otro cambio"));
    }

    @Test
    void siOtraPersonaCambioLaOrdenResponde409ConElMotivoYSiSePuedeAplicarIgual() throws Exception {
        when(service.cambiarEstado(any(), any(), any())).thenThrow(new ConflictoSincronizacionException(
                Motivo.ESTADO_CAMBIADO, "Mientras no tenías señal, la OT #7 pasó a Pendiente: tu cambio no se aplicó.",
                1L, "Pendiente", true));

        mockMvc.perform(put(URL_ESTADO).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("Mientras no tenías señal, la OT #7 pasó a Pendiente: tu cambio no se aplicó."))
                .andExpect(jsonPath("$.errores.motivo").value("ESTADO_CAMBIADO"))
                .andExpect(jsonPath("$.errores.sePuedeAplicar").value("true"))
                .andExpect(jsonPath("$.errores.estadoActualId").value("1"))
                .andExpect(jsonPath("$.errores.estadoActual").value("Pendiente"));
    }

    @Test
    void unConflictoSinEstadoNoInformaEstado() throws Exception {
        when(service.cambiarEstado(any(), any(), any())).thenThrow(new ConflictoSincronizacionException(
                Motivo.ORDEN_NO_EXISTE, "Ya no existe la OT #7: tu cambio no se aplicó."));

        mockMvc.perform(put(URL_ESTADO).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.motivo").value("ORDEN_NO_EXISTE"))
                .andExpect(jsonPath("$.errores.sePuedeAplicar").value("false"))
                .andExpect(jsonPath("$.errores.estadoActual").doesNotExist());
    }

    // ===================== Altas de orden =====================

    @Test
    void laMesaMandaUnaOrdenCargadaSinSenal() throws Exception {
        when(service.crearOrden(eq(UUID.fromString(COMANDA)), any(), any(Usuario.class))).thenReturn(orden(15L, "Pendiente"));

        mockMvc.perform(put(URL_ALTA).with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_ALTA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(15));

        ArgumentCaptor<AltaOrdenSinSenalDTO> pedido = ArgumentCaptor.forClass(AltaOrdenSinSenalDTO.class);
        verify(service).crearOrden(eq(UUID.fromString(COMANDA)), pedido.capture(), any(Usuario.class));
        assertEquals("Podar el fresno", pedido.getValue().orden().descripcion());
        assertEquals(3L, pedido.getValue().orden().lugarId());
    }

    @Test
    void elCapatazNoPuedeCrearOrdenes() throws Exception {
        mockMvc.perform(put(URL_ALTA).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ALTA))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void unaOrdenSinDescripcionResponde400ConElCampo() throws Exception {
        String sinDescripcion = JSON_ALTA.replace("\"descripcion\": \"Podar el fresno\",", "");

        mockMvc.perform(put(URL_ALTA).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(sinDescripcion))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores['orden.descripcion']").value("La descripción es obligatoria"));
        verifyNoInteractions(service);
    }

    @Test
    void unaAltaSinLosDatosDeLaOrdenResponde400() throws Exception {
        mockMvc.perform(put(URL_ALTA).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.orden").value("Faltan los datos de la orden"));
        verifyNoInteractions(service);
    }
}
