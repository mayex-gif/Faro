package com.faro.backend.models;

import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

/**
 * Cuadrilla: conjunto de trabajadores municipales asignados al mantenimiento.
 * Puede tener asignadas múltiples órdenes de trabajo en simultáneo para cubrir su recorrido.
 * 'disponible' indica su estado operativo: true = en servicio / lista para trabajar.
 */
@Entity
@Table(name = "cuadrillas")
public class Cuadrilla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre; // Ej: "Cuadrilla Verde"

    @Column
    private Integer integrantes; // Cantidad de trabajadores (opcional)

    @Column(nullable = false)
    private boolean disponible = true; // true = operativa / en servicio

    @ElementCollection(targetClass = TipoTrabajo.class)
    @CollectionTable(name = "cuadrilla_tipos_trabajo", joinColumns = @JoinColumn(name = "cuadrilla_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_trabajo", nullable = false, length = 30)
    private Set<TipoTrabajo> tiposTrabajo = new HashSet<>();

    public Cuadrilla() {}

    public Cuadrilla(String nombre, Integer integrantes, boolean disponible, Set<TipoTrabajo> tiposTrabajo) {
        this.nombre = nombre;
        this.integrantes = integrantes;
        this.disponible = disponible;
        this.tiposTrabajo = (tiposTrabajo != null) ? tiposTrabajo : new HashSet<>();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Integer getIntegrantes() { return integrantes; }
    public void setIntegrantes(Integer integrantes) { this.integrantes = integrantes; }

    public boolean isDisponible() { return disponible; }
    public void setDisponible(boolean disponible) { this.disponible = disponible; }

    public Set<TipoTrabajo> getTiposTrabajo() { return tiposTrabajo; }
    public void setTiposTrabajo(Set<TipoTrabajo> tiposTrabajo) { this.tiposTrabajo = tiposTrabajo; }
}
