package com.faro.backend.models;

import jakarta.persistence.*;

/**
 * Un "camino permitido" entre dos estados. Ej: de "Pendiente" se puede pasar a "En curso".
 * Si un camino no está en esta tabla, el sistema no deja hacer ese cambio de estado.
 */
@Entity
@Table(name = "transiciones_estado",
        // no puede repetirse el mismo camino dos veces
        uniqueConstraints = @UniqueConstraint(columnNames = {"estado_origen_id", "estado_destino_id"}))
public class TransicionEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Desde qué estado sale
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estado_origen_id", nullable = false)
    private EstadoOrden origen;

    // A qué estado llega
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estado_destino_id", nullable = false)
    private EstadoOrden destino;

    protected TransicionEstado() {
    }

    public TransicionEstado(EstadoOrden origen, EstadoOrden destino) {
        this.origen = origen;
        this.destino = destino;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public EstadoOrden getOrigen() { return origen; }
    public void setOrigen(EstadoOrden origen) { this.origen = origen; }

    public EstadoOrden getDestino() { return destino; }
    public void setDestino(EstadoOrden destino) { this.destino = destino; }
}