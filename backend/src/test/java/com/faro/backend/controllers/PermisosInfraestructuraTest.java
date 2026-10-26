package com.faro.backend.controllers;

import com.faro.backend.config.security.SecurityConfig;
import com.faro.backend.dto.PuntoInfraestructuraDTO;
import com.faro.backend.dto.PuntoInfraestructuraRequestDTO;
import com.faro.backend.services.PuntoInfraestructuraService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Quién puede qué con los lugares (con la seguridad real: @Import(SecurityConfig.class)).
 * Consultar: todos. Agregar: encargado y mesa de entradas. Modificar y borrar: solo el encargado.
 */
@WebMvcTest(PuntoInfraestructuraController.class)
@Import(SecurityConfig.class)
class PermisosInfraestructuraTest {

    private static final String URL = "/api/infraestructura";

    private static final String JSON_LUGAR = """
            {
              "nombre": "Plaza San Martín",
              "tipo": "ESPACIO_VERDE",
              "datosTecnicos": "Riego por aspersión",
              "estadoOperativo": true,
              "ubicacion": { "type": "Point", "coordinates": [-64.14, -31.13] }
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PuntoInfraestructuraService service;

    private static PuntoInfraestructuraDTO lugarGuardado() {
        return new PuntoInfraestructuraDTO(1L, "Plaza San Martín", "ESPACIO_VERDE", "Riego por aspersión", true, null);
    }

    // ---------- Consultar: todos ----------

    @Test
    void elCapatazPuedeVerLosLugares() throws Exception {
        when(service.obtenerTodos()).thenReturn(List.of());

        mockMvc.perform(get(URL).with(user(capataz(1L))))
                .andExpect(status().isOk());
    }

    // ---------- Agregar: encargado y mesa ----------

    @Test
    void elEncargadoPuedeAgregarUnLugar() throws Exception {
        when(service.crearLugar(any(PuntoInfraestructuraRequestDTO.class))).thenReturn(lugarGuardado());

        mockMvc.perform(post(URL).with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isOk());
    }

    @Test
    void mesaDeEntradasPuedeAgregarUnLugar() throws Exception {
        when(service.crearLugar(any(PuntoInfraestructuraRequestDTO.class))).thenReturn(lugarGuardado());

        mockMvc.perform(post(URL).with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void elCapatazNoPuedeAgregarUnLugar() throws Exception {
        mockMvc.perform(post(URL).with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.estado").value(403))
                .andExpect(jsonPath("$.mensaje").value("No tiene permisos para realizar esta acción"));

        verifyNoInteractions(service);
    }

    // ---------- Modificar y borrar: solo el encargado ----------

    @Test
    void elEncargadoPuedeModificarUnLugar() throws Exception {
        when(service.modificarLugar(eq(1L), any(PuntoInfraestructuraRequestDTO.class))).thenReturn(lugarGuardado());

        mockMvc.perform(put(URL + "/1").with(user(encargado())).contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isOk());
    }

    @Test
    void mesaDeEntradasNoPuedeModificarUnLugar() throws Exception {
        mockMvc.perform(put(URL + "/1").with(user(mesaDeEntradas())).contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void elCapatazNoPuedeModificarUnLugar() throws Exception {
        mockMvc.perform(put(URL + "/1").with(user(capataz(1L))).contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void elEncargadoPuedeBorrarUnLugar() throws Exception {
        mockMvc.perform(delete(URL + "/1").with(user(encargado())))
                .andExpect(status().isNoContent());

        verify(service).eliminarLugar(1L);
    }

    @Test
    void mesaDeEntradasNoPuedeBorrarUnLugar() throws Exception {
        mockMvc.perform(delete(URL + "/1").with(user(mesaDeEntradas())))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void elCapatazNoPuedeBorrarUnLugar() throws Exception {
        mockMvc.perform(delete(URL + "/1").with(user(capataz(1L))))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }
}