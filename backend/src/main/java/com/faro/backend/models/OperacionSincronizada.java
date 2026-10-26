package com.faro.backend.models;

import com.faro.backend.exceptions.ConflictoSincronizacionException;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Un renglón del "cuaderno" que llega desde el celular cuando vuelve la señal.
 * El id es el NÚMERO DE COMANDA que inventó el celular (un UUID) al anotar el cambio sin señal.
 * Si la misma comanda llega dos veces (el celular no supo si la primera llegó y la reintentó),
 * se encuentra acá y NO se vuelve a aplicar: así un reintento nunca duplica un cambio ni una OT.
 *
 * Guarda ids sueltos (no relaciones) porque es un registro: solo anota qué llegó, de quién y cómo terminó.
 */
@Entity
@Table(name = "operaciones_sincronizadas")
public class OperacionSincronizada {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private TipoOperacion tipo;

    // Quién hizo el cambio en el celular
    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    // A qué OT. En ALTA_ORDEN se completa cuando la OT ya se creó.
    @Column(name = "orden_id")
    private Long ordenId;

    // Solo en CAMBIO_ESTADO: a qué estado la quiso pasar
    @Column(name = "estado_pedido_id", updatable = false)
    private Long estadoPedidoId;

    // Solo en CAMBIO_ESTADO: en qué estado la vio el celular cuando se tocó el botón
    @Column(name = "estado_anterior_id", updatable = false)
    private Long estadoAnteriorId;

    // Hora en que se hizo en el celular (puede ser bastante antes de que llegue)
    @Column(name = "hecho_en", updatable = false)
    private OffsetDateTime hechoEn;

    // Hora en que llegó al servidor
    @Column(name = "recibida_en", nullable = false, updatable = false)
    private LocalDateTime recibidaEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResultadoOperacion resultado;

    // ===== Solo si es CONFLICTO: por qué no se aplicó (así, si la misma comanda vuelve a llegar, se responde igual) =====

    // El motivo como texto (ESTADO_CAMBIADO, ORDEN_CERRADA...): texto y no enum, así no hay CHECK que actualizar
    @Column(length = 30)
    private String motivo;

    @Column(length = 300)
    private String mensaje;

    // En qué estado estaba la OT en el servidor cuando llegó
    @Column(name = "estado_actual_id")
    private Long estadoActualId;

    @Column(name = "estado_actual", length = 100)
    private String estadoActual;

    // Boolean (con mayúscula) a propósito: puede quedar vacío, y así "ddl-auto=update" agrega la columna sin problemas
    @Column(name = "se_puede_aplicar")
    private Boolean sePuedeAplicar;

    @PrePersist
    void alRecibir() {
        recibidaEn = LocalDateTime.now();
    }

    // JPA necesita un constructor vacío para poder armar el objeto cuando lee de la base
    protected OperacionSincronizada() {
    }

    private OperacionSincronizada(UUID id, TipoOperacion tipo, Long usuarioId, Long ordenId,
                                  Long estadoPedidoId, Long estadoAnteriorId, OffsetDateTime hechoEn) {
        this.id = id;
        this.tipo = tipo;
        this.usuarioId = usuarioId;
        this.ordenId = ordenId;
        this.estadoPedidoId = estadoPedidoId;
        this.estadoAnteriorId = estadoAnteriorId;
        this.hechoEn = hechoEn;
        this.resultado = ResultadoOperacion.APLICADA;
    }

    // ============ "Fábricas": la forma de crear cada tipo de operación ============

    /** Sin señal, alguien pasó la OT ordenId del estado estadoAnteriorId al estado estadoId. */
    public static OperacionSincronizada cambioDeEstado(UUID id, Long usuarioId, Long ordenId, Long estadoId,
                                                       Long estadoAnteriorId, OffsetDateTime hechoEn) {
        return new OperacionSincronizada(id, TipoOperacion.CAMBIO_ESTADO, usuarioId, ordenId, estadoId,
                estadoAnteriorId, hechoEn);
    }

    /** Sin señal, alguien cargó una OT nueva (todavía no tiene número de OT). */
    public static OperacionSincronizada altaDeOrden(UUID id, Long usuarioId, OffsetDateTime hechoEn) {
        return new OperacionSincronizada(id, TipoOperacion.ALTA_ORDEN, usuarioId, null, null, null, hechoEn);
    }

    /** Anota que esta operación NO se aplicó y por qué. Devuelve la misma operación (para encadenar). */
    public OperacionSincronizada conConflicto(ConflictoSincronizacionException conflicto) {
        this.resultado = ResultadoOperacion.CONFLICTO;
        this.motivo = conflicto.getMotivo().name();
        this.mensaje = conflicto.getMessage();
        this.estadoActualId = conflicto.getEstadoActualId();
        this.estadoActual = conflicto.getEstadoActual();
        this.sePuedeAplicar = conflicto.isSePuedeAplicar();
        return this;
    }

    /** El mismo conflicto que se respondió la primera vez (para cuando la misma comanda vuelve a llegar). */
    public ConflictoSincronizacionException comoConflicto() {
        return new ConflictoSincronizacionException(ConflictoSincronizacionException.Motivo.valueOf(motivo), mensaje,
                estadoActualId, estadoActual, Boolean.TRUE.equals(sePuedeAplicar));
    }

    public UUID getId() {
        return id;
    }

    public TipoOperacion getTipo() {
        return tipo;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public Long getOrdenId() {
        return ordenId;
    }

    public void setOrdenId(Long ordenId) {
        this.ordenId = ordenId;
    }

    public Long getEstadoPedidoId() {
        return estadoPedidoId;
    }

    public Long getEstadoAnteriorId() {
        return estadoAnteriorId;
    }

    public OffsetDateTime getHechoEn() {
        return hechoEn;
    }

    public LocalDateTime getRecibidaEn() {
        return recibidaEn;
    }

    public ResultadoOperacion getResultado() {
        return resultado;
    }

    public String getMotivo() {
        return motivo;
    }

    public String getMensaje() {
        return mensaje;
    }
}
