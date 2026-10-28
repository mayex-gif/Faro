package com.faro.backend.models;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Regla de Mantenimiento Periódico: define la periodicidad con la que el sistema
 * genera automáticamente Órdenes de Trabajo (OT) sobre un lugar del municipio.
 */
@Entity
@Table(name = "reglas_mantenimiento")
public class ReglaMantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 500)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_trabajo", nullable = false, length = 30)
    private TipoTrabajo tipoTrabajo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrioridadOrden prioridad;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "punto_infraestructura_id", nullable = false)
    private PuntoInfraestructura lugar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuadrilla_id")
    private Cuadrilla cuadrilla;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoFrecuencia frecuencia;

    @Column(nullable = false)
    private int intervalo = 1;

    @Column(name = "dia_semana")
    private Integer diaSemana; // 1 = Lunes, ..., 7 = Domingo

    @Column(name = "dia_mes")
    private Integer diaMes; // 1 .. 31

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "proxima_ejecucion", nullable = false)
    private LocalDate proximaEjecucion;

    @Column(name = "ultima_generacion")
    private LocalDateTime ultimaGeneracion;

    @Column(nullable = false)
    private boolean activa = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void alCrear() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
    }

    public ReglaMantenimiento() {
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public TipoTrabajo getTipoTrabajo() { return tipoTrabajo; }
    public void setTipoTrabajo(TipoTrabajo tipoTrabajo) { this.tipoTrabajo = tipoTrabajo; }

    public PrioridadOrden getPrioridad() { return prioridad; }
    public void setPrioridad(PrioridadOrden prioridad) { this.prioridad = prioridad; }

    public PuntoInfraestructura getLugar() { return lugar; }
    public void setLugar(PuntoInfraestructura lugar) { this.lugar = lugar; }

    public Cuadrilla getCuadrilla() { return cuadrilla; }
    public void setCuadrilla(Cuadrilla cuadrilla) { this.cuadrilla = cuadrilla; }

    public TipoFrecuencia getFrecuencia() { return frecuencia; }
    public void setFrecuencia(TipoFrecuencia frecuencia) { this.frecuencia = frecuencia; }

    public int getIntervalo() { return intervalo; }
    public void setIntervalo(int intervalo) { this.intervalo = Math.max(1, intervalo); }

    public Integer getDiaSemana() { return diaSemana; }
    public void setDiaSemana(Integer diaSemana) { this.diaSemana = diaSemana; }

    public Integer getDiaMes() { return diaMes; }
    public void setDiaMes(Integer diaMes) { this.diaMes = diaMes; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public LocalDate getProximaEjecucion() { return proximaEjecucion; }
    public void setProximaEjecucion(LocalDate proximaEjecucion) { this.proximaEjecucion = proximaEjecucion; }

    public LocalDateTime getUltimaGeneracion() { return ultimaGeneracion; }
    public void setUltimaGeneracion(LocalDateTime ultimaGeneracion) { this.ultimaGeneracion = ultimaGeneracion; }

    public boolean isActiva() { return activa; }
    public void setActiva(boolean activa) { this.activa = activa; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
