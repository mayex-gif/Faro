package com.faro.backend.models;

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

    // Hora en que se hizo en el celular (puede ser bastante antes de que llegue)
    @Column(name = "hecho_en", updatable = false)
    private OffsetDateTime hechoEn;

    // Hora en que llegó al servidor
    @Column(name = "recibida_en", nullable = false, updatable = false)
    private LocalDateTime recibidaEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResultadoOperacion resultado;

    @PrePersist
    void alRecibir() {
        recibidaEn = LocalDateTime.now();
    }

    // JPA necesita un constructor vacío para poder armar el objeto cuando lee de la base
    protected OperacionSincronizada() {
    }

    private OperacionSincronizada(UUID id, TipoOperacion tipo, Long usuarioId, Long ordenId,
                                  Long estadoPedidoId, OffsetDateTime hechoEn) {
        this.id = id;
        this.tipo = tipo;
        this.usuarioId = usuarioId;
        this.ordenId = ordenId;
        this.estadoPedidoId = estadoPedidoId;
        this.hechoEn = hechoEn;
        this.resultado = ResultadoOperacion.APLICADA;
    }

    // ============ "Fábricas": la forma de crear cada tipo de operación ============

    /** Sin señal, alguien pasó la OT ordenId al estado estadoId. */
    public static OperacionSincronizada cambioDeEstado(UUID id, Long usuarioId, Long ordenId, Long estadoId,
                                                       OffsetDateTime hechoEn) {
        return new OperacionSincronizada(id, TipoOperacion.CAMBIO_ESTADO, usuarioId, ordenId, estadoId, hechoEn);
    }

    /** Sin señal, alguien cargó una OT nueva (todavía no tiene número de OT). */
    public static OperacionSincronizada altaDeOrden(UUID id, Long usuarioId, OffsetDateTime hechoEn) {
        return new OperacionSincronizada(id, TipoOperacion.ALTA_ORDEN, usuarioId, null, null, hechoEn);
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

    public OffsetDateTime getHechoEn() {
        return hechoEn;
    }

    public LocalDateTime getRecibidaEn() {
        return recibidaEn;
    }

    public ResultadoOperacion getResultado() {
        return resultado;
    }
}
