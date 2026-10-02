package com.faro.backend.controllers;

import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests del OrdenTrabajoController con MockMvc.
 * MockMvc simula pedidos HTTP (GET, POST, PUT) sin levantar el servidor ni la base:
 * el service es un mock, así que acá probamos solo la "capa web":
 * rutas, códigos HTTP, validaciones (@Valid) y el ManejadorDeErrores.
 */
@WebMvcTest(OrdenTrabajoController.class)
class OrdenTrabajoControllerTest {

    private static final String URL = "/api/ordenes-trabajo";

    private static final String JSON_VALIDO = """
            {
              "descripcion": "Podar el árbol de la esquina",
              "tipo": "PODA",
              "origen": "RECLAMO_VECINAL",
              "prioridad": "ALTA",
              "lugarId": 1
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService service;

    private OrdenTrabajoDTO ordenDeEjemplo(Long id) {
        return new OrdenTrabajoDTO(id, "Podar el árbol de la esquina", TipoTrabajo.PODA,
                OrigenOrden.RECLAMO_VECINAL, PrioridadOrden.ALTA, 1L, "Plaza San Martín",
                LocalDateTime.of(2026, 10, 1, 10, 30), 1L, "Pendiente", "#566A73");
    }

    // ---------- GET ----------

    @Test
    void listarSinFiltroDevuelveTodasLasOrdenes() throws Exception {
        when(service.listar()).thenReturn(List.of(ordenDeEjemplo(1L), ordenDeEjemplo(2L)));

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].lugarNombre").value("Plaza San Martín"));

        verify(service).listar();
        verify(service, never()).listarPorLugar(any());
    }

    @Test
    void listarConLugarIdFiltraPorLugar() throws Exception {
        when(service.listarPorLugar(1L)).thenReturn(List.of(ordenDeEjemplo(1L)));

        mockMvc.perform(get(URL).param("lugarId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].lugarId").value(1));

        verify(service).listarPorLugar(1L);
        verify(service, never()).listar();
    }

    @Test
    void obtenerDevuelveLaOrden() throws Exception {
        when(service.obtener(5L)).thenReturn(ordenDeEjemplo(5L));

        mockMvc.perform(get(URL + "/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.tipo").value("PODA"))
                .andExpect(jsonPath("$.prioridad").value("ALTA"));
    }

    @Test
    void obtenerUnaOrdenInexistenteResponde404() throws Exception {
        when(service.obtener(99L)).thenThrow(new RecursoNoEncontradoException("No existe la orden de trabajo 99"));

        mockMvc.perform(get(URL + "/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andExpect(jsonPath("$.mensaje").value("No existe la orden de trabajo 99"));
    }

    // ---------- POST ----------

    @Test
    void crearUnaOrdenValidaResponde201() throws Exception {
        when(service.crear(any(OrdenTrabajoRequestDTO.class))).thenReturn(ordenDeEjemplo(1L));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));

        verify(service).crear(new OrdenTrabajoRequestDTO("Podar el árbol de la esquina", TipoTrabajo.PODA,
                OrigenOrden.RECLAMO_VECINAL, PrioridadOrden.ALTA, 1L));
    }

    @Test
    void crearConCamposVaciosResponde400ConElErrorDeCadaCampo() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{ \"descripcion\": \"  \" }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.mensaje").value("Hay datos inválidos en el pedido"))
                .andExpect(jsonPath("$.errores.descripcion").value("La descripción es obligatoria"))
                .andExpect(jsonPath("$.errores.tipo").value("El tipo de trabajo es obligatorio"))
                .andExpect(jsonPath("$.errores.origen").value("El origen es obligatorio"))
                .andExpect(jsonPath("$.errores.prioridad").value("La prioridad es obligatoria"))
                .andExpect(jsonPath("$.errores.lugarId").value("El lugar es obligatorio"));

        // si los datos no son válidos, el pedido nunca llega al service
        verifyNoInteractions(service);
    }

    @Test
    void crearConDescripcionMuyLargaResponde400() throws Exception {
        String larga = "a".repeat(501);
        String json = JSON_VALIDO.replace("Podar el árbol de la esquina", larga);

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.descripcion").value("La descripción no puede superar los 500 caracteres"));

        verifyNoInteractions(service);
    }

    @Test
    void crearConUnTipoQueNoExisteResponde400() throws Exception {
        String json = JSON_VALIDO.replace("\"PODA\"", "\"PODAA\"");

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.mensaje").value("El pedido tiene un formato inválido o algún valor no permitido"));

        verifyNoInteractions(service);
    }

    @Test
    void crearConUnLugarInexistenteResponde404() throws Exception {
        when(service.crear(any(OrdenTrabajoRequestDTO.class)))
                .thenThrow(new RecursoNoEncontradoException("No existe el lugar 1"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("No existe el lugar 1"));
    }

    // ---------- PUT ----------

    @Test
    void modificarUnaOrdenValidaResponde200() throws Exception {
        when(service.modificar(eq(3L), any(OrdenTrabajoRequestDTO.class))).thenReturn(ordenDeEjemplo(3L));

        mockMvc.perform(put(URL + "/3").contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3));

        verify(service).modificar(eq(3L), any(OrdenTrabajoRequestDTO.class));
    }

    @Test
    void modificarConDatosInvalidosResponde400() throws Exception {
        mockMvc.perform(put(URL + "/3").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.descripcion").exists());

        verifyNoInteractions(service);
    }

    @Test
    void modificarUnaOrdenInexistenteResponde404() throws Exception {
        when(service.modificar(eq(99L), any(OrdenTrabajoRequestDTO.class)))
                .thenThrow(new RecursoNoEncontradoException("No existe la orden de trabajo 99"));

        mockMvc.perform(put(URL + "/99").contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDO))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404));
    }
}
