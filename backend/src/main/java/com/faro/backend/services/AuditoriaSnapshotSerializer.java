package com.faro.backend.services;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.hibernate.proxy.HibernateProxy;
import org.locationtech.jts.geom.Geometry;
import org.springframework.stereotype.Component;

import java.lang.reflect.Array;
import java.lang.reflect.InvocationTargetException;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Convierte estados de Hibernate a JSON plano y elimina campos sensibles. */
@Component
public class AuditoriaSnapshotSerializer {

    private final ObjectMapper objectMapper;

    public AuditoriaSnapshotSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String serializar(String[] propiedades, Object[] valores) {
        if (propiedades == null || valores == null) {
            return null;
        }
        Map<String, Object> captura = new LinkedHashMap<>();
        int cantidad = Math.min(propiedades.length, valores.length);
        for (int indice = 0; indice < cantidad; indice++) {
            String propiedad = propiedades[indice];
            if (propiedad != null && !esSensible(propiedad)) {
                captura.put(propiedad, normalizar(valores[indice]));
            }
        }
        try {
            return objectMapper.writeValueAsString(captura);
        } catch (JacksonException ex) {
            throw new IllegalStateException("No se pudo serializar la captura de auditoría", ex);
        }
    }

    private boolean esSensible(String propiedad) {
        String nombre = propiedad.toLowerCase(java.util.Locale.ROOT);
        return nombre.contains("password") || nombre.contains("clave")
                || nombre.contains("secret") || nombre.contains("token")
                || nombre.contains("credential");
    }

    private Object normalizar(Object valor) {
        if (valor == null || valor instanceof String || valor instanceof Number
                || valor instanceof Boolean || valor instanceof UUID) {
            return valor;
        }
        if (valor instanceof TemporalAccessor temporal) {
            return temporal.toString();
        }
        if (valor instanceof Enum<?> enumeracion) {
            return enumeracion.name();
        }
        if (valor instanceof Geometry geometria) {
            return geometria.toText();
        }
        if (valor instanceof HibernateProxy proxy) {
            return Map.of("id", proxy.getHibernateLazyInitializer().getIdentifier());
        }
        if (valor instanceof Collection<?> coleccion) {
            return coleccion.stream().map(this::normalizar).toList();
        }
        if (valor.getClass().isArray()) {
            List<Object> elementos = new ArrayList<>();
            for (int indice = 0; indice < Array.getLength(valor); indice++) {
                elementos.add(normalizar(Array.get(valor, indice)));
            }
            return elementos;
        }
        if (valor.getClass().isAnnotationPresent(jakarta.persistence.Entity.class)) {
            return Map.of("id", extraerId(valor));
        }
        return valor.toString();
    }

    private Object extraerId(Object entidad) {
        try {
            return entidad.getClass().getMethod("getId").invoke(entidad);
        } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException ex) {
            throw new IllegalStateException("No se pudo obtener el identificador de una relación auditada", ex);
        }
    }
}
