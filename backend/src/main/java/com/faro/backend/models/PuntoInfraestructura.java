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

    // false = la luminaria está planificada pero todavía no se puso ("Falta poner" en la pestaña Luminarias).
    // Los lugares cargados antes de este campo quedan en null y cuentan como instalados.
    @Column(name = "instalada")
    private Boolean instalada;

    // Solo luminarias: true = Nueva (ej. LED), false = Vieja. Se puede cambiar después en los dos sentidos.
    // null = "Sin marcar" (cargada antes de este campo), y siempre null en calles, lugares y luminarias a futuro.
    // Es Boolean y no un enum a propósito: Hibernate crea un CHECK con los valores de un enum y ddl-auto=update no lo actualiza.
    @Column(name = "nueva")
    private Boolean nueva;

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

    public Boolean getInstalada() { return instalada; }
    public void setInstalada(Boolean instalada) { this.instalada = instalada; }

    public Boolean getNueva() { return nueva; }
    public void setNueva(Boolean nueva) { this.nueva = nueva; }

    public Geometry getUbicacion() { return ubicacion; }
    public void setUbicacion(Geometry ubicacion) { this.ubicacion = ubicacion; }
}