package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.models.Usuario;
import com.faro.backend.services.OrdenTrabajoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Quién puede qué con las órdenes de trabajo (con la seguridad real: @Import(SecurityConfig.class)).
 * Consultar: todos. Crear: encargado y mesa. Modificar, asignar y reasignar: solo el encargado.
 * Cambiar el estado: encargado y capataz (que sea de SU cuadrilla se controla en el service).
 */
@WebMvcTest(OrdenTrabajoController.class)
@Import(SecurityConfig.class)
class PermisosOrdenesTest {

    private static final String URL = "/api/ordenes-trabajo";

    private static final String JSON_ORDEN = """
            {
              "descripcion": "Podar el árbol de la esquina",
              "tipo": "PODA",
              "origen": "RECLAMO_VECINAL",
              "prioridad": "ALTA",
              "lugarId": 1
            }
            """;

    private static final String JSON_CUADRILLA = "{ \"cuadrillaId\": 4 }";

    private static final String JSON_ESTADO = "{ \"estadoId\": 3 }";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService service;

    private static OrdenTrabajoDTO ordenGuardada() {
        return new OrdenTrabajoDTO(7L, "Podar el árbol de la esquina", TipoTrabajo.PODA, OrigenOrden.RECLAMO_VECINAL,
                PrioridadOrden.ALTA, 1L, "Plaza San Martín", LocalDateTime.of(2026, 10, 25, 10, 0),
                3L, "En curso", "#9A4A12");
    }

    // ---------- Consultar: todos ----------

    @Test
    void elCapatazPuedeVerLasOrdenes() throws Exception {
        when(service.listar()).thenReturn(List.of());

        mockMvc.perform(get(URL).with(user(capataz(1L))))
                .andExpect(status().isOk());
    }

    @Test
    void mesaDeEntradasPuedeVerUnaOrden() throws Exception {
        when(service.obtener(7L)).thenReturn(ordenGuardada());

        mockMvc.perform(get(URL + "/7").with(user(mesaDeEntradas())))
                .andExpect(status().isOk());
    }

    // ---------- Crear: encargado y mesa ----------

    @Test
    void elEncargadoPuedeCrearUnaOrden() throws Exception {
        when(service.crear(any(OrdenTrabajoRequestDTO.class))).thenReturn(ordenGuardada());

        mockMvc.perform(post(URL).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_ORDEN))
                .andExpect(status().isCreated());
    }

    @Test
    void mesaDeEntradasPuedeCrearUnaOrden() throws Exception {
        when(service.crear(any(OrdenTrabajoRequestDTO.class))).thenReturn(ordenGuardada());

        mockMvc.perform(post(URL).with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_ORDEN))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void elCapatazNoPuedeCrearUnaOrden() throws Exception {
        mockMvc.perform(post(URL).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ORDEN))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.estado").value(403))
                .andExpect(jsonPath("$.mensaje").value("No tiene permisos para realizar esta acción"));

        verifyNoInteractions(service);
    }

    // ---------- Modificar: solo el encargado ----------

    @Test
    void elEncargadoPuedeModificarUnaOrden() throws Exception {
        when(service.modificar(eq(7L), any(OrdenTrabajoRequestDTO.class))).thenReturn(ordenGuardada());

        mockMvc.perform(put(URL + "/7").with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_ORDEN))
                .andExpect(status().isOk());
    }

    @Test
    void mesaDeEntradasNoPuedeModificarUnaOrden() throws Exception {
        mockMvc.perform(put(URL + "/7").with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_ORDEN))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void elCapatazNoPuedeModificarUnaOrden() throws Exception {
        mockMvc.perform(put(URL + "/7").with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ORDEN))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    // ---------- Asignar y reasignar cuadrilla: solo el encargado ----------

    @Test
    void elEncargadoPuedeAsignarCuadrilla() throws Exception {
        when(service.asignarCuadrilla(7L, 4L)).thenReturn(ordenGuardada());

        mockMvc.perform(patch(URL + "/7/cuadrilla").with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_CUADRILLA))
                .andExpect(status().isOk());
    }

    @Test
    void mesaDeEntradasNoPuedeAsignarCuadrilla() throws Exception {
        mockMvc.perform(patch(URL + "/7/cuadrilla").with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_CUADRILLA))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void elCapatazNoPuedeAsignarCuadrilla() throws Exception {
        mockMvc.perform(patch(URL + "/7/cuadrilla").with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_CUADRILLA))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void elEncargadoPuedeReasignarCuadrilla() throws Exception {
        when(service.reasignarCuadrilla(7L, 4L)).thenReturn(ordenGuardada());

        mockMvc.perform(patch(URL + "/7/reasignacion").with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_CUADRILLA))
                .andExpect(status().isOk());
    }

    @Test
    void mesaDeEntradasNoPuedeReasignarCuadrilla() throws Exception {
        mockMvc.perform(patch(URL + "/7/reasignacion").with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_CUADRILLA))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void elCapatazNoPuedeReasignarCuadrilla() throws Exception {
        mockMvc.perform(patch(URL + "/7/reasignacion").with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_CUADRILLA))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    // ---------- Cambiar el estado: encargado y capataz ----------

    @Test
    void elEncargadoPuedeCambiarElEstado() throws Exception {
        when(service.cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(3L)), any(Usuario.class))).thenReturn(ordenGuardada());

        mockMvc.perform(patch(URL + "/7/estado").with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isOk());
    }

    @Test
    void elCapatazPuedeCambiarElEstado() throws Exception {
        when(service.cambiarEstado(eq(7L), eq(new CambioEstadoRequestDTO(3L)), any(Usuario.class))).thenReturn(ordenGuardada());

        mockMvc.perform(patch(URL + "/7/estado").with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isOk());
    }

    @Test
    void mesaDeEntradasNoPuedeCambiarElEstado() throws Exception {
        mockMvc.perform(patch(URL + "/7/estado").with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_ESTADO))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }
}
