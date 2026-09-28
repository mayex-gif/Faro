package com.faro.backend.models;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Geometry;

@Entity
@Table(name = "puntos_infraestructura")
public class PuntoInfraestructura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre; // Ej: "Plaza San Martín" o "Luminaria #102"

    @Column(nullable = false)
    private String tipo; // Ej: "ESPACIO_VERDE", "CALLE", "LUMINARIA"[cite: 2]

    @Column(name = "datos_tecnicos")
    private String datosTecnicos; // Para cumplir con el registro de características[cite: 3]

    @Column(name = "estado_operativo")
    private Boolean estadoOperativo; // Para identificar si la luminaria funciona, por ejemplo[cite: 3]

    // Mapeo espacial para PostGIS
    // El SRID 4326 es el estándar GPS (WGS84) que usa Google Maps
    @Column(columnDefinition = "geometry(Geometry, 4326)", nullable = false)
    private Geometry ubicacion;

    // Constructores vacíos y con parámetros
    public PuntoInfraestructura() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getDatosTecnicos() { return datosTecnicos; }
    public void setDatosTecnicos(String datosTecnicos) { this.datosTecnicos = datosTecnicos; }

    public Boolean getEstadoOperativo() { return estadoOperativo; }
    public void setEstadoOperativo(Boolean estadoOperativo) { this.estadoOperativo = estadoOperativo; }

    public Geometry getUbicacion() { return ubicacion; }
    public void setUbicacion(Geometry ubicacion) { this.ubicacion = ubicacion; }
}