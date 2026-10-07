package com.faro.backend.models;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Un renglón de la "bitácora" de una Orden de Trabajo: algo que le pasó, con su fecha.
 * La OT solo guarda cómo está AHORA (como un pizarrón que se borra y se reescribe);
 * los eventos guardan TODO lo que fue pasando, y nunca se modifican ni se borran.
 * Con estos renglones se arma la Ficha Histórica del Lugar.
 */
@Entity
@Table(name = "eventos_orden")
public class EventoOrden {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // A qué OT le pasó. Una OT puede tener MUCHOS eventos.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false, updatable = false)
    private OrdenTrabajo orden;

    @Enumerated(EnumType.STRING) // se guarda el NOMBRE ("CAMBIO_ESTADO"), no un número
    @Column(nullable = false, length = 30, updatable = false)
    private TipoEventoOrden tipo;

    // De qué estado venía la OT (ej: "Pendiente")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estado_anterior_id", updatable = false)
    private EstadoOrden estadoAnterior;

    // A qué estado pasó (ej: "En curso")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estado_nuevo_id", updatable = false)
    private EstadoOrden estadoNuevo;

    // Solo en los eventos CUADRILLA_ASIGNADA: qué cuadrilla se asignó (en los demás queda vacío)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuadrilla_id", updatable = false)
    private Cuadrilla cuadrilla;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;

    // Se ejecuta solo, justo antes de guardar el evento: le pone la fecha y hora de ese momento
    @PrePersist
    void alRegistrar() {
        fecha = LocalDateTime.now();
    }

    // JPA necesita un constructor vacío para poder armar el objeto cuando lee de la base
    protected EventoOrden() {
    }

    private EventoOrden(OrdenTrabajo orden, TipoEventoOrden tipo,
                        EstadoOrden estadoAnterior, EstadoOrden estadoNuevo, Cuadrilla cuadrilla) {
        this.orden = orden;
        this.tipo = tipo;
        this.estadoAnterior = estadoAnterior;
        this.estadoNuevo = estadoNuevo;
        this.cuadrilla = cuadrilla;
    }

    // ============ "Fábricas": la forma de crear cada tipo de evento ============

    /** La OT pasó de un estado a otro. Ej: cambioDeEstado(ot, pendiente, planificada) */
    public static EventoOrden cambioDeEstado(OrdenTrabajo orden, EstadoOrden anterior, EstadoOrden nuevo) {
        return new EventoOrden(orden, TipoEventoOrden.CAMBIO_ESTADO, anterior, nuevo, null);
    }

    /** A la OT se le asignó una cuadrilla, y con eso pasó de un estado a otro. */
    public static EventoOrden asignacionDeCuadrilla(OrdenTrabajo orden, Cuadrilla cuadrilla,
                                                    EstadoOrden anterior, EstadoOrden nuevo) {
        return new EventoOrden(orden, TipoEventoOrden.CUADRILLA_ASIGNADA, anterior, nuevo, cuadrilla);
    }

    // Getters (sin setters: un renglón de la bitácora no se cambia)
    public Long getId() { return id; }
    public OrdenTrabajo getOrden() { return orden; }
    public TipoEventoOrden getTipo() { return tipo; }
    public EstadoOrden getEstadoAnterior() { return estadoAnterior; }
    public EstadoOrden getEstadoNuevo() { return estadoNuevo; }
    public Cuadrilla getCuadrilla() { return cuadrilla; }
    public LocalDateTime getFecha() { return fecha; }

    // Solo para los tests: en la aplicación la fecha la pone alRegistrar() y el id la base
    public void setId(Long id) { this.id = id; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}