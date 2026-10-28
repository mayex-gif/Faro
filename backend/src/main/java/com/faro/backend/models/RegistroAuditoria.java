package com.faro.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** Registro inmutable de una acción realizada sobre un dato clave del sistema. */
@Entity
@Table(name = "registros_auditoria")
public class RegistroAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private AccionAuditoria accion;

    @Column(name = "tipo_registro", nullable = false, length = 100, updatable = false)
    private String tipoRegistro;

    @Column(name = "registro_id", nullable = false, length = 100, updatable = false)
    private String registroId;

    @Column(nullable = false, length = 150, updatable = false)
    private String actor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;

    @Column(name = "valores_anteriores", columnDefinition = "TEXT", updatable = false)
    private String valoresAnteriores;

    @Column(name = "valores_nuevos", columnDefinition = "TEXT", updatable = false)
    private String valoresNuevos;

    protected RegistroAuditoria() {
    }

    RegistroAuditoria(AccionAuditoria accion, String tipoRegistro, String registroId, String actor,
                     LocalDateTime fecha, String valoresAnteriores, String valoresNuevos) {
        this.accion = accion;
        this.tipoRegistro = tipoRegistro;
        this.registroId = registroId;
        this.actor = actor;
        this.fecha = fecha;
        this.valoresAnteriores = valoresAnteriores;
        this.valoresNuevos = valoresNuevos;
    }

    public Long getId() { return id; }
    public AccionAuditoria getAccion() { return accion; }
    public String getTipoRegistro() { return tipoRegistro; }
    public String getRegistroId() { return registroId; }
    public String getActor() { return actor; }
    public LocalDateTime getFecha() { return fecha; }
    public String getValoresAnteriores() { return valoresAnteriores; }
    public String getValoresNuevos() { return valoresNuevos; }
}
