package com.faro.backend.controllers;

import com.faro.backend.dto.PuntoInfraestructuraDTO;
import com.faro.backend.dto.PuntoInfraestructuraRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.services.PuntoInfraestructuraService;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests del PuntoInfraestructuraController con MockMvc.
 * El service es un mock: se prueban rutas, códigos HTTP, el formato GeoJSON de la ubicación
 * (que pasa por GeometriaJson) y los errores 404/409 del ManejadorDeErrores.
 */
@WebMvcTest(PuntoInfraestructuraController.class)
class PuntoInfraestructuraControllerTest {

    private static final String URL = "/api/infraestructura";

    private static final String JSON_LUGAR = """
            {
              "nombre": "Plaza San Martín",
              "tipo": "ESPACIO_VERDE",
              "datosTecnicos": "Riego por aspersión",
              "estadoOperativo": true,
              "ubicacion": { "type": "Point", "coordinates": [-64.18, -31.42] }
            }
            """;

    private static final GeometryFactory FABRICA = new GeometryFactory(new PrecisionModel(), 4326);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PuntoInfraestructuraService service;

    private PuntoInfraestructuraDTO lugarDeEjemplo(Long id) {
        Point punto = FABRICA.createPoint(new Coordinate(-64.18, -31.42));
        return new PuntoInfraestructuraDTO(id, "Plaza San Martín", "ESPACIO_VERDE",
                "Riego por aspersión", true, punto);
    }

    // ---------- GET ----------

    @Test
    void obtenerTodosDevuelveLosLugaresConUbicacionEnGeoJson() throws Exception {
        when(service.obtenerTodos()).thenReturn(List.of(lugarDeEjemplo(1L)));

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Plaza San Martín"))
                .andExpect(jsonPath("$[0].ubicacion.type").value("Point"))
                .andExpect(jsonPath("$[0].ubicacion.coordinates[0]").value(-64.18))
                .andExpect(jsonPath("$[0].ubicacion.coordinates[1]").value(-31.42));
    }

    @Test
    void obtenerActivosFiltraPorTipo() throws Exception {
        when(service.obtenerInfraestructuraActiva("ESPACIO_VERDE")).thenReturn(List.of(lugarDeEjemplo(1L)));

        mockMvc.perform(get(URL + "/activos").param("tipo", "ESPACIO_VERDE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipo").value("ESPACIO_VERDE"));

        verify(service).obtenerInfraestructuraActiva("ESPACIO_VERDE");
    }

    // ---------- POST / PUT ----------

    @Test
    void crearConvierteElGeoJsonYDevuelveElLugar() throws Exception {
        when(service.crearLugar(any(PuntoInfraestructuraRequestDTO.class))).thenReturn(lugarDeEjemplo(1L));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        // revisamos que el GeoJSON que mandó la pantalla llegó al service como un punto real
        ArgumentCaptor<PuntoInfraestructuraRequestDTO> captor = ArgumentCaptor.forClass(PuntoInfraestructuraRequestDTO.class);
        verify(service).crearLugar(captor.capture());
        Point recibido = (Point) captor.getValue().ubicacion();
        assertEquals(-64.18, recibido.getX());
        assertEquals(-31.42, recibido.getY());
        assertEquals(4326, recibido.getSRID());
    }

    @Test
    void actualizarDevuelveElLugarModificado() throws Exception {
        when(service.modificarLugar(eq(1L), any(PuntoInfraestructuraRequestDTO.class))).thenReturn(lugarDeEjemplo(1L));

        mockMvc.perform(put(URL + "/1").contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Plaza San Martín"));
    }

    @Test
    void actualizarUnLugarInexistenteResponde404() throws Exception {
        when(service.modificarLugar(eq(99L), any(PuntoInfraestructuraRequestDTO.class)))
                .thenThrow(new RecursoNoEncontradoException("Lugar no encontrado"));

        mockMvc.perform(put(URL + "/99").contentType(MediaType.APPLICATION_JSON).content(JSON_LUGAR))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andExpect(jsonPath("$.mensaje").value("Lugar no encontrado"));
    }

    // ---------- DELETE ----------

    @Test
    void eliminarResponde204() throws Exception {
        mockMvc.perform(delete(URL + "/1"))
                .andExpect(status().isNoContent());

        verify(service).eliminarLugar(1L);
    }

    @Test
    void eliminarUnLugarConOrdenesResponde409() throws Exception {
        doThrow(new OperacionNoPermitidaException("No se puede borrar el lugar porque tiene órdenes de trabajo asociadas"))
                .when(service).eliminarLugar(1L);

        mockMvc.perform(delete(URL + "/1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("No se puede borrar el lugar porque tiene órdenes de trabajo asociadas"));
    }

    @Test
    void eliminarUnLugarInexistenteResponde404() throws Exception {
        doThrow(new RecursoNoEncontradoException("Lugar no encontrado")).when(service).eliminarLugar(99L);

        mockMvc.perform(delete(URL + "/99"))
                .andExpect(status().isNotFound());
    }
}
