package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.GeneracionOrdenesResultadoDTO;
import com.faro.backend.dto.ReglaMantenimientoDTO;
import com.faro.backend.dto.ReglaMantenimientoRequestDTO;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoFrecuencia;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.services.CalculoDesvioService;
import com.faro.backend.services.MotorMantenimientoService;
import com.faro.backend.services.ReglaMantenimientoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReglaMantenimientoController.class)
@Import(SecurityConfig.class)
@DisplayName("Permisos y Seguridad en Mantenimiento Periódico")
class PermisosMantenimientoTest {

    private static final String URL = "/api/mantenimiento-reglas";

    private static final String JSON_VALIDO = """
            {
              "titulo": "Poda mensual",
              "descripcion": "Podar árboles",
              "tipoTrabajo": "PODA",
              "prioridad": "MEDIA",
              "lugarId": 1,
              "frecuencia": "MENSUAL",
              "intervalo": 1,
              "diaMes": 15,
              "fechaInicio": "2026-11-01",
              "activa": true
            }
            """;

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

    private static ReglaMantenimientoDTO dtoEjemplo() {
        return new ReglaMantenimientoDTO(
                1L, "Poda", "Desc", TipoTrabajo.PODA, PrioridadOrden.MEDIA,
                1L, "Plaza", null, null, TipoFrecuencia.MENSUAL, 1, null, 15,
                LocalDate.now(), null, LocalDate.now(), null, true, LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("Sin iniciar sesión, cualquier petición devuelve 401")
    void sinSesionDevuelve401() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(reglaService, motorService);
    }

    @Test
    @DisplayName("Consultar reglas: permitido para cualquier rol autenticado")
    void consultarReglasPermitidoParaTodos() throws Exception {
        when(reglaService.listar(null, null)).thenReturn(List.of());

        mockMvc.perform(get(URL).with(user(encargado()))).andExpect(status().isOk());
        mockMvc.perform(get(URL).with(user(capataz(1L)))).andExpect(status().isOk());
        mockMvc.perform(get(URL).with(user(mesaDeEntradas()))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Crear regla: solo el Encargado del Corralón (Capataz y Mesa reciben 403)")
    void crearReglaSoloEncargado() throws Exception {
        when(reglaService.crear(any(ReglaMantenimientoRequestDTO.class))).thenReturn(dtoEjemplo());

        // Encargado: puede (201)
        mockMvc.perform(post(URL)
                        .with(user(encargado()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_VALIDO))
                .andExpect(status().isCreated());

        // Capataz: no puede (403)
        mockMvc.perform(post(URL)
                        .with(user(capataz(1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_VALIDO))
                .andExpect(status().isForbidden());

        // Mesa de entradas: no puede (403)
        mockMvc.perform(post(URL)
                        .with(user(mesaDeEntradas()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_VALIDO))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Modificar regla: solo el Encargado del Corralón")
    void modificarReglaSoloEncargado() throws Exception {
        when(reglaService.modificar(eq(1L), any(ReglaMantenimientoRequestDTO.class))).thenReturn(dtoEjemplo());

        mockMvc.perform(put(URL + "/1")
                        .with(user(encargado()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_VALIDO))
                .andExpect(status().isOk());

        mockMvc.perform(put(URL + "/1")
                        .with(user(capataz(1L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_VALIDO))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Pausar y activar regla: solo el Encargado del Corralón")
    void pausarYActivarSoloEncargado() throws Exception {
        when(reglaService.pausar(1L)).thenReturn(dtoEjemplo());
        when(reglaService.activar(1L)).thenReturn(dtoEjemplo());

        mockMvc.perform(patch(URL + "/1/pausar").with(user(encargado()))).andExpect(status().isOk());
        mockMvc.perform(patch(URL + "/1/pausar").with(user(mesaDeEntradas()))).andExpect(status().isForbidden());

        mockMvc.perform(patch(URL + "/1/activar").with(user(encargado()))).andExpect(status().isOk());
        mockMvc.perform(patch(URL + "/1/activar").with(user(capataz(1L)))).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Eliminar regla: solo el Encargado del Corralón")
    void eliminarReglaSoloEncargado() throws Exception {
        doNothing().when(reglaService).eliminar(1L);

        mockMvc.perform(delete(URL + "/1").with(user(encargado()))).andExpect(status().isNoContent());
        mockMvc.perform(delete(URL + "/1").with(user(capataz(1L)))).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Disparar ejecución de motor: solo el Encargado del Corralón")
    void dispararEjecucionSoloEncargado() throws Exception {
        when(motorService.generarOrdenesPendientes(any())).thenReturn(new GeneracionOrdenesResultadoDTO(LocalDate.now(), 0, 0, List.of()));

        mockMvc.perform(post(URL + "/ejecutar-pendientes").with(user(encargado()))).andExpect(status().isOk());
        mockMvc.perform(post(URL + "/ejecutar-pendientes").with(user(capataz(1L)))).andExpect(status().isForbidden());
    }
}
