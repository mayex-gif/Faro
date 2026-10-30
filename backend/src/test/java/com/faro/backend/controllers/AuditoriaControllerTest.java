package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.PaginaAuditoriaDTO;
import com.faro.backend.dto.RegistroAuditoriaDTO;
import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.services.AuditoriaConsultaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuditoriaController.class)
@Import(SecurityConfig.class)
class AuditoriaControllerTest {

    private static final String URL = "/api/auditoria";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuditoriaConsultaService service;

    @Test
    void encargadoConsultaLaAuditoriaConFiltros() throws Exception {
        LocalDateTime desde = LocalDateTime.of(2026, 10, 1, 0, 0);
        LocalDateTime hasta = LocalDateTime.of(2026, 10, 31, 23, 59);
        when(service.buscar(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PaginaAuditoriaDTO(List.of(new RegistroAuditoriaDTO(9L,
                        AccionAuditoria.MODIFICACION, "OrdenTrabajo", "42", "ana@faro.gob.ar",
                        desde.plusDays(1), java.util.Map.of("estado", "Pendiente"),
                        java.util.Map.of("estado", "Finalizada"))), 0, 20, 1, 1, true, true));

        mockMvc.perform(get(URL).with(user(encargado()))
                        .param("accion", "MODIFICACION")
                        .param("tipoRegistro", "OrdenTrabajo")
                        .param("registroId", "42")
                        .param("actor", "ana")
                        .param("desde", "2026-10-01T00:00:00")
                        .param("hasta", "2026-10-31T23:59:00")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.tamanio").value(20))
                .andExpect(jsonPath("$.registros.length()").value(1))
                .andExpect(jsonPath("$.registros[0].accion").value("MODIFICACION"))
                .andExpect(jsonPath("$.registros[0].actor").value("ana@faro.gob.ar"))
                .andExpect(jsonPath("$.registros[0].valoresNuevos.estado").value("Finalizada"));

        verify(service).buscar(AccionAuditoria.MODIFICACION, "OrdenTrabajo", "42", "ana",
                desde, hasta, 0, 20);
    }

    @Test
    void omiteFiltrosYAplicaLaPaginacionPredeterminada() throws Exception {
        when(service.buscar(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PaginaAuditoriaDTO(List.of(), 0, 20, 0, 0, true, true));

        mockMvc.perform(get(URL).with(user(encargado())))
                .andExpect(status().isOk());

        verify(service).buscar(null, null, null, null, null, null, 0, 20);
    }

    @Test
    void capatazNoPuedeConsultarLaAuditoria() throws Exception {
        mockMvc.perform(get(URL).with(user(capataz(1L))))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void mesaDeEntradasNoPuedeConsultarLaAuditoria() throws Exception {
        mockMvc.perform(get(URL).with(user(mesaDeEntradas())))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void exigeUnaSesionIniciada() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void rechazaUnTamanioDePaginaMayorAlMaximo() throws Exception {
        mockMvc.perform(get(URL).with(user(encargado())).param("size", "101"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }
}
