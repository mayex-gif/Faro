package com.faro.backend.services;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import com.faro.backend.models.TipoTrabajo;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Coordinate;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AuditoriaSnapshotSerializerTest {

    private final ObjectMapper mapper = JsonMapper.builder().build();
    private final AuditoriaSnapshotSerializer serializer = new AuditoriaSnapshotSerializer(mapper);

    @Test
    void serializaValoresYOmiteCredenciales() throws Exception {
        String[] propiedades = {"nombre", "password", "tokenAcceso", "tipo", "fecha", "tipos"};
        Object[] valores = {"Plaza", "hash-secreto", "token-secreto", TipoTrabajo.PODA,
                LocalDate.of(2026, 10, 28), List.of(TipoTrabajo.PODA, TipoTrabajo.ALUMBRADO)};

        JsonNode json = mapper.readTree(serializer.serializar(propiedades, valores));

        assertEquals("Plaza", json.get("nombre").asText());
        assertFalse(json.has("password"));
        assertFalse(json.has("tokenAcceso"));
        assertEquals("PODA", json.get("tipo").asText());
        assertEquals("2026-10-28", json.get("fecha").asText());
        assertEquals(2, json.get("tipos").size());
    }

    @Test
    void convierteGeometriaAWellKnownText() throws Exception {
        var punto = new GeometryFactory().createPoint(new Coordinate(-58.0, -34.0));

        JsonNode json = mapper.readTree(serializer.serializar(new String[]{"ubicacion"}, new Object[]{punto}));

        assertEquals("POINT (-58 -34)", json.get("ubicacion").asText());
    }

    @Test
    void serializaRelacionesComoIdentificadores() throws Exception {
        EntidadRelacionada relacionada = new EntidadRelacionada();
        relacionada.setId(17L);

        JsonNode json = mapper.readTree(serializer.serializar(new String[]{"relacion"}, new Object[]{relacionada}));

        assertEquals(17L, json.get("relacion").get("id").asLong());
    }

    @Test
    void convierteValoresDesconocidosATexto() throws Exception {
        Object valor = new Object() {
            @Override
            public String toString() {
                return "valor-compatible";
            }
        };

        JsonNode json = mapper.readTree(serializer.serializar(new String[]{"valor"}, new Object[]{valor}));

        assertEquals("valor-compatible", json.get("valor").asText());
    }

    @Test
    void informaSiUnaRelacionNoExponeUnIdentificador() {
        EntidadSinIdentificador relacionada = new EntidadSinIdentificador();

        assertThrows(IllegalStateException.class,
                () -> serializer.serializar(new String[]{"relacion"}, new Object[]{relacionada}));
    }

    @Test
    void manejaEstadosAusentesYLongitudesDistintas() throws Exception {
        assertNull(serializer.serializar(null, new Object[0]));
        assertNull(serializer.serializar(new String[0], null));
        JsonNode json = mapper.readTree(serializer.serializar(new String[]{"uno", "dos"}, new Object[]{1}));
        assertEquals(1, json.get("uno").asInt());
        assertFalse(json.has("dos"));
    }

    @jakarta.persistence.Entity
    static class EntidadRelacionada {
        @jakarta.persistence.Id
        private Long id;

        public Long getId() { return id; }
        void setId(Long id) { this.id = id; }
    }

    @jakarta.persistence.Entity
    static class EntidadSinIdentificador {
    }
}
