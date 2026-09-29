package com.faro.backend.config;

import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.locationtech.jts.io.geojson.GeoJsonWriter;
import org.springframework.boot.jackson.JacksonComponent;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.ValueSerializer;

/**
 * Enseña a Jackson 3 a convertir ubicaciones (Geometry de JTS) desde y hacia GeoJSON.
 * Sirve para cualquier tipo de geometría: Point, LineString, Polygon, etc.
 * Spring lo registra automáticamente gracias a @JacksonComponent.
 */
@JacksonComponent
public class GeometriaJson {

    // Salida: Geometry (Java) -> GeoJSON (texto que recibe la pantalla)
    public static class Serializer extends ValueSerializer<Geometry> {
        @Override
        public void serialize(Geometry geometria, JsonGenerator generador, SerializationContext contexto) {
            GeoJsonWriter escritor = new GeoJsonWriter();
            escritor.setEncodeCRS(false); // no agregamos el "crs": se asume GPS (4326)
            generador.writeRawValue(escritor.write(geometria));
        }
    }

    // Entrada: GeoJSON (texto que manda la pantalla) -> Geometry (Java)
    public static class Deserializer extends ValueDeserializer<Geometry> {
        @Override
        public Geometry deserialize(JsonParser lector, DeserializationContext contexto) {
            JsonNode geojson = lector.readValueAsTree();
            try {
                Geometry geometria = new GeoJsonReader().read(geojson.toString());
                geometria.setSRID(4326); // sistema de coordenadas GPS, el mismo que la columna de la base
                return geometria;
            } catch (ParseException e) {
                throw new IllegalArgumentException("La ubicación no es un GeoJSON válido: " + e.getMessage(), e);
            }
        }
    }
}