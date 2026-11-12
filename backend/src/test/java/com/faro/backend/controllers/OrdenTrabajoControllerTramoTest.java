package com.faro.backend.controllers;

import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.services.OrdenTrabajoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests del tramo de calle en la API de OT: el tramo viaja como GeoJSON (LineString)
 * de ida (pedido) y de vuelta (respuesta).
 */
@WebMvcTest(OrdenTrabajoController.class)
class OrdenTrabajoControllerTramoTest {

    private static final String URL = "/api/ordenes-trabajo";

    private static final String JSON_CON_TRAMO = """
            {
              "descripcion": "Bachear",
              "tipo": "BACHEO",
              "origen": "RECLAMO_VECINAL",
              "prioridad": "ALTA",
              "lugarId": 5,
              "calleEntre1": "Catamarca",
              "calleEntre2": "La Rioja",
              "tramo": { "type": "LineString", "coordinates": [[-64.1410, -31.1340], [-64.1397, -31.1340]] }
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService service;

    private static LineString tramo() {
        return new GeometryFactory().createLineString(new Coordinate[]{
                new Coordinate(-64.1410, -31.1340), new Coordinate(-64.1397, -31.1340)});
    }

    private OrdenTrabajoDTO ordenConTramo(Long id) {
        return new OrdenTrabajoDTO(id, "Bachear", TipoTrabajo.BACHEO, OrigenOrden.RECLAMO_VECINAL,
                PrioridadOrden.ALTA, 5L, "Buenos Aires", LocalDateTime.of(2026, 11, 11, 10, 0),
                1L, "Pendiente", "#566A73", null, null, null, null, null,
                "Catamarca", "La Rioja", null, null, tramo());
    }

    @Test
    @DisplayName("POST con tramo: llega al service como LineString y vuelve como GeoJSON")
    void crearConTramo() throws Exception {
        when(service.crear(any(OrdenTrabajoRequestDTO.class))).thenReturn(ordenConTramo(1L));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_CON_TRAMO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tramo.type").value("LineString"))
                .andExpect(jsonPath("$.tramo.coordinates[0][0]").value(-64.141))
                .andExpect(jsonPath("$.tramo.coordinates[1][1]").value(-31.134));

        ArgumentCaptor<OrdenTrabajoRequestDTO> captor = ArgumentCaptor.forClass(OrdenTrabajoRequestDTO.class);
        verify(service).crear(captor.capture());
        LineString recibido = (LineString) captor.getValue().tramo();
        assertEquals(2, recibido.getNumPoints());
        assertEquals(4326, recibido.getSRID());
    }

    @Test
    @DisplayName("POST sin tramo: la OT es de toda la calle (tramo null en el pedido y en la respuesta)")
    void crearSinTramo() throws Exception {
        String sinTramo = JSON_CON_TRAMO.replaceAll(",\\s*\"tramo\".*\\n", "\n");
        when(service.crear(any(OrdenTrabajoRequestDTO.class))).thenReturn(
                new OrdenTrabajoDTO(2L, "Bachear", TipoTrabajo.BACHEO, OrigenOrden.RECLAMO_VECINAL,
                        PrioridadOrden.ALTA, 5L, "Buenos Aires", LocalDateTime.of(2026, 11, 11, 10, 0),
                        1L, "Pendiente", "#566A73"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(sinTramo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tramo").doesNotExist());

        ArgumentCaptor<OrdenTrabajoRequestDTO> captor = ArgumentCaptor.forClass(OrdenTrabajoRequestDTO.class);
        verify(service).crear(captor.capture());
        assertNull(captor.getValue().tramo());
    }

    @Test
    @DisplayName("PUT con un tramo fuera de la calle: 400 con el error en el campo tramo")
    void modificarConTramoInvalidoResponde400() throws Exception {
        when(service.modificar(eq(3L), any(OrdenTrabajoRequestDTO.class)))
                .thenThrow(new DatoInvalidoException("tramo", "El tramo tiene que estar sobre la calle Buenos Aires"));

        mockMvc.perform(put(URL + "/3").contentType(MediaType.APPLICATION_JSON).content(JSON_CON_TRAMO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.tramo").value("El tramo tiene que estar sobre la calle Buenos Aires"));
    }

    @Test
    @DisplayName("POST con un tramo que no es GeoJSON: 400 y no llega al service")
    void crearConTramoQueNoEsGeoJsonResponde400() throws Exception {
        String roto = JSON_CON_TRAMO.replaceAll("\"tramo\": \\{.*}", "\"tramo\": { \"type\": \"Cualquiera\" }");

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(roto))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }
}
