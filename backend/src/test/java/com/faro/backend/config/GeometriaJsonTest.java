package com.faro.backend.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.module.SimpleModule;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests del conversor GeometriaJson (Geometry <-> GeoJSON).
 * No usa Spring ni base de datos: solo el conversor y Jackson.
 */
class GeometriaJsonTest {

    private static final GeometryFactory FABRICA = new GeometryFactory(new PrecisionModel(), 4326);
    private static final double TOLERANCIA = 0.000001; // margen para comparar decimales

    private JsonMapper mapper;

    // Se ejecuta ANTES de cada test: arma un traductor de JSON con nuestro conversor adentro
    @BeforeEach
    void prepararMapper() {
        SimpleModule modulo = new SimpleModule();
        modulo.addSerializer(Geometry.class, new GeometriaJson.Serializer());
        modulo.addDeserializer(Geometry.class, new GeometriaJson.Deserializer());
        mapper = JsonMapper.builder().addModule(modulo).build();
    }

    // ===================== SALIDA: Java -> GeoJSON =====================

    @Test
    void escribir_unPunto_generaGeoJsonConTipoYCoordenadas() {
        Point punto = FABRICA.createPoint(new Coordinate(-58.3816, -34.6037));

        String json = mapper.writeValueAsString(punto);

        // Leemos el texto generado para revisar cada parte
        JsonNode geojson = mapper.readTree(json);
        assertEquals("Point", geojson.get("type").stringValue());
        assertEquals(-58.3816, geojson.get("coordinates").get(0).doubleValue(), TOLERANCIA); // longitud primero
        assertEquals(-34.6037, geojson.get("coordinates").get(1).doubleValue(), TOLERANCIA); // latitud después
    }

    // ===================== ENTRADA: GeoJSON -> Java =====================

    @Test
    void leer_geoJsonDeUnPunto_armaElPuntoConSistemaGps() {
        String json = """
                { "type": "Point", "coordinates": [-58.3816, -34.6037] }
                """;

        Geometry geometria = mapper.readValue(json, Geometry.class);

        // assertInstanceOf verifica que sea un Point y nos lo devuelve ya como Point
        Point punto = assertInstanceOf(Point.class, geometria);
        assertEquals(-58.3816, punto.getX(), TOLERANCIA); // X = longitud
        assertEquals(-34.6037, punto.getY(), TOLERANCIA); // Y = latitud
        assertEquals(4326, punto.getSRID());              // sistema GPS, igual que la columna de la base
    }

    @Test
    void leer_geoJsonDeUnaLinea_armaLaLineaConSusPuntos() {
        String json = """
                { "type": "LineString", "coordinates": [[-58.3816, -34.6037], [-58.3790, -34.6040]] }
                """;

        Geometry geometria = mapper.readValue(json, Geometry.class);

        LineString linea = assertInstanceOf(LineString.class, geometria);
        assertEquals(2, linea.getNumPoints());
    }

    @Test
    void leer_geoJsonInvalido_daError() {
        String json = """
                { "type": "Triangulo", "coordinates": [1, 2] }
                """;

        assertThrows(RuntimeException.class, () -> mapper.readValue(json, Geometry.class));
    }

    // ===================== IDA Y VUELTA =====================

    @Test
    void idaYVuelta_unPoligono_quedaIgualQueElOriginal() {
        // Un cuadrado, como el contorno de una plaza (el primer y último punto son el mismo: se "cierra")
        Polygon plaza = FABRICA.createPolygon(new Coordinate[] {
                new Coordinate(-58.40, -34.60),
                new Coordinate(-58.39, -34.60),
                new Coordinate(-58.39, -34.61),
                new Coordinate(-58.40, -34.61),
                new Coordinate(-58.40, -34.60)
        });

        String json = mapper.writeValueAsString(plaza);          // Java -> GeoJSON
        Geometry vuelta = mapper.readValue(json, Geometry.class); // GeoJSON -> Java

        assertTrue(plaza.equalsExact(vuelta, TOLERANCIA), "El polígono cambió al ir y volver: " + json);
    }
}