package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.config.security.UsuariosDePrueba;
import com.faro.backend.dto.reportes.*;
import com.faro.backend.exceptions.RangoReporteInvalidoException;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.services.ExportacionCsvService;
import com.faro.backend.services.ReporteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests del ReporteController: seguridad, rutas y respuestas.
 * Importamos SecurityConfig para validar los @PreAuthorize reales.
 */
@WebMvcTest(ReporteController.class)
@Import(SecurityConfig.class)
class ReporteControllerTest {

    private static final String URL_DASHBOARD  = "/api/reportes/dashboard";
    private static final String URL_OTS_CSV    = "/api/reportes/ots-resueltas/csv";
    private static final String URL_DESVIOS_CSV = "/api/reportes/desvios/csv";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReporteService reporteService;

    @MockitoBean
    private ExportacionCsvService exportacionCsvService;

    // ─────────────────────────────────────────────────────────────────────────
    // Seguridad — sin sesión
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void dashboardSinSesionResponde401() throws Exception {
        mockMvc.perform(get(URL_DASHBOARD))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(reporteService);
    }

    @Test
    void otsCsvSinSesionResponde401() throws Exception {
        mockMvc.perform(get(URL_OTS_CSV))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(exportacionCsvService);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seguridad — rol incorrecto
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void dashboardConRolCapatazResponde403() throws Exception {
        mockMvc.perform(get(URL_DASHBOARD)
                        .with(user(UsuariosDePrueba.capataz(1L))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(reporteService);
    }

    @Test
    void dashboardConRolMesaDeEntradasResponde403() throws Exception {
        mockMvc.perform(get(URL_DASHBOARD)
                        .with(user(UsuariosDePrueba.mesaDeEntradas())))
                .andExpect(status().isForbidden());
        verifyNoInteractions(reporteService);
    }

    @Test
    void otsCsvConRolCapatazResponde403() throws Exception {
        mockMvc.perform(get(URL_OTS_CSV)
                        .with(user(UsuariosDePrueba.capataz(1L))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(exportacionCsvService);
    }

    @Test
    void desviosCsvConRolMesaDeEntradasResponde403() throws Exception {
        mockMvc.perform(get(URL_DESVIOS_CSV)
                        .with(user(UsuariosDePrueba.mesaDeEntradas())))
                .andExpect(status().isForbidden());
        verifyNoInteractions(exportacionCsvService);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Acceso correcto — ENCARGADO_CORRALON
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void dashboardConEncargadoRetorna200YJsonCorrecto() throws Exception {
        DashboardGerencialDTO dto = dashboardVacio();
        when(reporteService.construirDashboard(any(), any(), any(), any())).thenReturn(dto);

        mockMvc.perform(get(URL_DASHBOARD)
                        .with(user(UsuariosDePrueba.encargado())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOts").value(0))
                .andExpect(jsonPath("$.otsCerradas").value(0))
                .andExpect(jsonPath("$.otsPendientes").value(0));
    }

    @Test
    void dashboardAceptaParametrosDeGranularidadYFechas() throws Exception {
        DashboardGerencialDTO dto = dashboardVacio();
        when(reporteService.construirDashboard(any(), any(), any(), any())).thenReturn(dto);

        mockMvc.perform(get(URL_DASHBOARD)
                        .param("desde", "2026-10-01")
                        .param("hasta", "2026-10-31")
                        .param("granularidad", "DIA")
                        .param("atajo", "SEMANA")
                        .with(user(UsuariosDePrueba.encargado())))
                .andExpect(status().isOk());

        verify(reporteService).construirDashboard(
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 31),
                GranularidadPeriodo.DIA,
                AtajoTemporalReporte.SEMANA
        );
    }

    @Test
    void exportarOtsCsvConEncargadoRetorna200YHeaderAttachment() throws Exception {
        byte[] csvFalso = "ID;Estado\r\n1;Finalizada\r\n".getBytes();
        when(reporteService.obtenerOtsParaCsv(any(), any(), any())).thenReturn(List.of());
        when(exportacionCsvService.generarCsvOts(any())).thenReturn(csvFalso);

        mockMvc.perform(get(URL_OTS_CSV)
                        .with(user(UsuariosDePrueba.encargado())))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.startsWith("attachment; filename=\"ots-resueltas-")))
                .andExpect(content().contentTypeCompatibleWith("text/csv"));
    }

    @Test
    void exportarDesviosCsvConEncargadoRetorna200YHeaderAttachment() throws Exception {
        byte[] csvFalso = "ID;Clasificacion\r\n1;A_TIEMPO\r\n".getBytes();
        when(reporteService.obtenerDesviosParaCsv(any(), any(), any())).thenReturn(List.of());
        when(exportacionCsvService.generarCsvDesvios(any())).thenReturn(csvFalso);

        mockMvc.perform(get(URL_DESVIOS_CSV)
                        .with(user(UsuariosDePrueba.encargado())))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.startsWith("attachment; filename=\"desvios-")))
                .andExpect(content().contentTypeCompatibleWith("text/csv"));
    }

    @Test
    void dashboardSinParametrosUsaValoresPorDefecto() throws Exception {
        DashboardGerencialDTO dto = dashboardVacio();
        when(reporteService.construirDashboard(null, null, null, null)).thenReturn(dto);

        mockMvc.perform(get(URL_DASHBOARD)
                        .with(user(UsuariosDePrueba.encargado())))
                .andExpect(status().isOk());

        // Sin parámetros, el controller pasa null al service (que aplica los defaults internamente)
        verify(reporteService).construirDashboard(null, null, null, null);
    }

    @Test
    void dashboardConRangoInvertidoResponde400() throws Exception {
        when(reporteService.construirDashboard(any(), any(), any(), any()))
                .thenThrow(new RangoReporteInvalidoException("La fecha 'desde' no puede ser posterior a 'hasta'"));

        mockMvc.perform(get(URL_DASHBOARD)
                        .param("desde", "2026-10-31")
                        .param("hasta", "2026-10-01")
                        .with(user(UsuariosDePrueba.encargado())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────────────

    private DashboardGerencialDTO dashboardVacio() {
        ResumenDesviosGlobalDTO resumen = new ResumenDesviosGlobalDTO(0, 0, 0, 0, 0, 0, 0, 0.0, 0.0);
        return new DashboardGerencialDTO(
                LocalDate.now().withDayOfMonth(1),
                LocalDate.now(),
                GranularidadPeriodo.MES,
                0, 0, 0,
                List.of(), List.of(), List.of(), List.of(),
                resumen
        );
    }
}
