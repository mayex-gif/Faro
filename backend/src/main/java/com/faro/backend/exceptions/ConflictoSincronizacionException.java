package com.faro.backend.exceptions;

/**
 * Un cambio hecho sin señal que ya no se puede aplicar tal cual porque, mientras el celular estaba sin red,
 * la OT cambió (otra persona la movió, se cerró, se reasignó a otra cuadrilla...). Responde 409.
 * Lleva el motivo (para que la pantalla sepa qué ofrecer) y si todavía se puede "aplicar igual".
 */
public class ConflictoSincronizacionException extends RuntimeException {

    /** Por qué no se aplicó. Se guarda como texto en la base (no como enum: así no hay CHECK que actualizar). */
    public enum Motivo {
        ESTADO_CAMBIADO,     // otra persona la pasó a otro estado antes (el único caso en que se puede "aplicar igual")
        ORDEN_CERRADA,       // ya está Finalizada o Cancelada
        OTRA_CUADRILLA,      // se reasignó y ya no es de la cuadrilla del capataz
        ORDEN_NO_EXISTE,     // la OT ya no está
        DATO_NO_EXISTE,      // el estado o el lugar pedido ya no existen
        CAMINO_NO_PERMITIDO, // desde el estado en que está no hay flecha al estado pedido
        SIN_PERMISO          // la persona ya no puede hacer esto (ej: le cambiaron el rol)
    }

    private final Motivo motivo;
    private final Long estadoActualId;
    private final String estadoActual;
    private final boolean sePuedeAplicar;

    public ConflictoSincronizacionException(Motivo motivo, String mensaje, Long estadoActualId, String estadoActual,
                                            boolean sePuedeAplicar) {
        super(mensaje);
        this.motivo = motivo;
        this.estadoActualId = estadoActualId;
        this.estadoActual = estadoActual;
        this.sePuedeAplicar = sePuedeAplicar;
    }

    /** Conflicto en el que no se informa estado (ej: la OT no existe, el alta de una OT). */
    public ConflictoSincronizacionException(Motivo motivo, String mensaje) {
        this(motivo, mensaje, null, null, false);
    }

    public Motivo getMotivo() {
        return motivo;
    }

    public Long getEstadoActualId() {
        return estadoActualId;
    }

    public String getEstadoActual() {
        return estadoActual;
    }

    public boolean isSePuedeAplicar() {
        return sePuedeAplicar;
    }
}
