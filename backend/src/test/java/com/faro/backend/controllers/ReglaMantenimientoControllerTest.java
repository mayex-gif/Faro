package com.faro.backend.controllers;

import com.faro.backend.dto.*;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.services.CalculoDesvioService;
import com.faro.backend.services.MotorMantenimientoService;
import com.faro.backend.services.ReglaMantenimientoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReglaMantenimientoController.class)
@DisplayName("ReglaMantenimientoController con MockMvc")
class ReglaMantenimientoControllerTest {

    private static final String URL = "/api/mantenimiento-reglas";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReglaMantenimientoService reglaService;

    @MockitoBean
    private MotorMantenimientoService motorService;

    @MockitoBean
    private CalculoDesvioService desvioService;

    @MockitoBean
    private OrdenTrabajoRepository ordenRepository;

    private static ReglaMantenimientoDTO dtoEjemplo(Long id, String titulo) {
        return new ReglaMantenimientoDTO(
                id,
                titulo,
                "Cortar el pasto del parque",
                TipoTrabajo.CORTE_DE_PASTO,
                PrioridadOrden.MEDIA,
                10L,
                "Plaza San Martín",
                20L,
                "Espacios Verdes",
                TipoFrecuencia.SEMANAL,
                1,
                1,
                null,
                LocalDate.of(2026, 10, 1),
                null,
                LocalDate.of(2026, 10, 8),
                LocalDateTime.of(2026, 10, 1, 6, 0),
                true,
                LocalDateTime.of(2026, 9, 30, 12, 0)
        );
    }

    @Test
    @DisplayName("GET /api/mantenimiento-reglas devuelve lista de reglas con 200")
    void listarReglas() throws Exception {
        when(reglaService.listar(null, null)).thenReturn(List.of(dtoEjemplo(1L, "Poda"), dtoEjemplo(2L, "Pasto")));

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[1].id").value(2));
    }

    @Test
    @DisplayName("GET /api/mantenimiento-reglas/{id} devuelve 200 si la regla existe")
    void obtenerReglaExistente() throws Exception {
        when(reglaService.obtener(1L)).thenReturn(dtoEjemplo(1L, "Poda"));

        mockMvc.perform(get(URL + "/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.titulo").value("Poda"));
    }

    @Test
    @DisplayName("GET /api/mantenimiento-reglas/{id} devuelve 404 si la regla no existe")
    void obtenerReglaInexistente() throws Exception {
        when(reglaService.obtener(99L)).thenThrow(new RecursoNoEncontradoException("Regla de mantenimiento no encontrada"));

        mockMvc.perform(get(URL + "/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("Regla de mantenimiento no encontrada"));
    }

    @Test
    @DisplayName("POST /api/mantenimiento-reglas con datos válidos devuelve 201 Created")
    void crearReglaValida() throws Exception {
        String json = """
                {
                  "titulo": "Poda mensual",
                  "descripcion": "Podar árboles de calle principal",
                  "tipoTrabajo": "PODA",
                  "prioridad": "ALTA",
                  "lugarId": 10,
                  "cuadrillaId": 20,
                  "frecuencia": "MENSUAL",
                  "intervalo": 1,
                  "diaMes": 15,
                  "fechaInicio": "2026-11-01",
                  "activa": true
                }
                """;

        when(reglaService.crear(any(ReglaMantenimientoRequestDTO.class))).thenReturn(dtoEjemplo(1L, "Poda mensual"));

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.titulo").value("Poda mensual"));
    }

    @Test
    @DisplayName("POST /api/mantenimiento-reglas con campos obligatorios vacíos devuelve 400 Bad Request")
    void crearReglaInvalida() throws Exception {
        String jsonInvalido = """
                {
                  "titulo": "",
                  "descripcion": ""
                }
                """;

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonInvalido))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.errores.titulo").exists())
                .andExpect(jsonPath("$.errores.tipoTrabajo").exists());
    }

    @Test
    @DisplayName("PATCH /api/mantenimiento-reglas/{id}/pausar devuelve 200 con la regla pausada")
    void pausarRegla() throws Exception {
        ReglaMantenimientoDTO pausada = new ReglaMantenimientoDTO(
                1L, "Corte", "Desc", TipoTrabajo.CORTE_DE_PASTO, PrioridadOrden.MEDIA,
                10L, "Plaza", null, null, TipoFrecuencia.DIARIA, 1, null, null,
                LocalDate.now(), null, LocalDate.now(), null, false, LocalDateTime.now()
        );
        when(reglaService.pausar(1L)).thenReturn(pausada);

        mockMvc.perform(patch(URL + "/1/pausar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activa").value(false));
    }

    @Test
    @DisplayName("DELETE /api/mantenimiento-reglas/{id} devuelve 204 No Content")
    void eliminarRegla() throws Exception {
        doNothing().when(reglaService).eliminar(1L);

        mockMvc.perform(delete(URL + "/1"))
                .andExpect(status().isNoContent());

        verify(reglaService).eliminar(1L);
    }

    @Test
    @DisplayName("POST /api/mantenimiento-reglas/ejecutar-pendientes ejecuta evaluación y devuelve 200")
    void ejecutarPendientes() throws Exception {
        GeneracionOrdenesResultadoDTO res = new GeneracionOrdenesResultadoDTO(
                LocalDate.of(2026, 10, 28),
                3,
                2,
                List.of()
        );
        when(motorService.generarOrdenesPendientes(any(LocalDate.class))).thenReturn(res);

        mockMvc.perform(post(URL + "/ejecutar-pendientes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reglasEvaluadas").value(3))
                .andExpect(jsonPath("$.ordenesGeneradas").value(2));
    }

    @Test
    @DisplayName("POST /api/mantenimiento-reglas/{id}/ejecutar ejecuta regla puntual y devuelve 200")
    void ejecutarReglaPuntual() throws Exception {
        OrdenTrabajoDTO ot = new OrdenTrabajoDTO(
                100L, "Corte de pasto", TipoTrabajo.CORTE_DE_PASTO, OrigenOrden.PLAN_MANTENIMIENTO,
                PrioridadOrden.MEDIA, 10L, "Plaza San Martín", LocalDateTime.now(),
                1L, "Pendiente", "#566A73", null, null, LocalDate.of(2026, 10, 28), null, 1L
        );
        when(motorService.ejecutarReglaManualmente(eq(1L), any(LocalDate.class))).thenReturn(ot);

        mockMvc.perform(post(URL + "/1/ejecutar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.origen").value("PLAN_MANTENIMIENTO"));
    }

    @Test
    @DisplayName("GET /api/mantenimiento-reglas/{id}/desvios devuelve reporte de desvíos con 200")
    void desviosPorRegla() throws Exception {
        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setId(1L);
        regla.setTitulo("Corte quincenal");

        when(reglaService.buscarRegla(1L)).thenReturn(regla);
        when(ordenRepository.findByReglaMantenimientoIdOrderByFechaPlanificadaDesc(1L)).thenReturn(List.of());
        when(desvioService.calcularResumen(eq(1L), eq("Corte quincenal"), any(), any()))
                .thenReturn(new ResumenDesviosDTO(1L, "Corte quincenal", 4, 3, 0, 1, 0, 0, 0, 0.5, 75.0, List.of()));

        mockMvc.perform(get(URL + "/1/desvios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reglaId").value(1))
                .andExpect(jsonPath("$.porcentajeCumplimiento").value(75.0));
    }

    @Test
    @DisplayName("GET /api/mantenimiento-reglas/desvios devuelve reporte global con 200")
    void desviosGlobales() throws Exception {
        when(ordenRepository.findByReglaMantenimientoIsNotNullOrderByFechaPlanificadaDesc()).thenReturn(List.of());
        when(desvioService.calcularResumen(eq(null), any(), any(), any()))
                .thenReturn(new ResumenDesviosDTO(null, "Consolidado Municipal de Mantenimiento", 10, 8, 1, 1, 0, 0, 0, 0.2, 90.0, List.of()));

        mockMvc.perform(get(URL + "/desvios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalGeneradas").value(10))
                .andExpect(jsonPath("$.porcentajeCumplimiento").value(90.0));
    }
}
