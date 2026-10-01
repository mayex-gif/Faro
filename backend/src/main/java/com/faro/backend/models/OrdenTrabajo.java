package com.faro.backend.models;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Orden de Trabajo (OT): un trabajo a realizar sobre un lugar del pueblo.
 * Cada OT pertenece a UN Punto de Infraestructura; un punto puede tener MUCHAS OT.
 * Los estados (pendiente, en curso, etc.) se agregan en la tarjeta 3 (motor de flujo).
 */
@Entity
@Table(name = "ordenes_trabajo")
public class OrdenTrabajo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String descripcion; // Ej: "Cortar el pasto del sector juegos"

    @Enumerated(EnumType.STRING) // se guarda el NOMBRE ("PODA"), no un número
    @Column(nullable = false, length = 30)
    private TipoTrabajo tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrigenOrden origen;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrioridadOrden prioridad;

    // Relación "muchos a uno": muchas OT pueden ser del mismo lugar
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "punto_infraestructura_id", nullable = false)
    private PuntoInfraestructura lugar;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    // Se ejecuta solo, justo antes de guardar la OT por primera vez
    @PrePersist
    void alCrear() {
        fechaCreacion = LocalDateTime.now();
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public TipoTrabajo getTipo() { return tipo; }
    public void setTipo(TipoTrabajo tipo) { this.tipo = tipo; }

    public OrigenOrden getOrigen() { return origen; }
    public void setOrigen(OrigenOrden origen) { this.origen = origen; }

    public PrioridadOrden getPrioridad() { return prioridad; }
    public void setPrioridad(PrioridadOrden prioridad) { this.prioridad = prioridad; }

    public PuntoInfraestructura getLugar() { return lugar; }
    public void setLugar(PuntoInfraestructura lugar) { this.lugar = lugar; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}