package com.faro.backend.models;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Un mensaje del muro "Comentarios y fotos" de una Orden de Trabajo: texto, fotos o las dos cosas.
 * No se edita (no tiene setters); el autor o el encargado lo pueden borrar, y la auditoría anota quién.
 *
 * operacionId es el NÚMERO DE COMANDA que inventa el celular (un UUID) al escribir el comentario,
 * con o sin señal. Si el mismo comentario llega dos veces (un reintento), se encuentra por ese número
 * y no se duplica. Es único en la tabla.
 */
@Entity
@Table(name = "comentarios_orden")
public class ComentarioOrden {

    // Límites de un comentario (los usa también el service para validar)
    public static final int MAX_TEXTO = 1000;
    public static final int MAX_FOTOS = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operacion_id", nullable = false, unique = true, updatable = false)
    private UUID operacionId;

    // En qué OT se escribió. Una OT puede tener MUCHOS comentarios.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false, updatable = false)
    private OrdenTrabajo orden;

    // Quién lo escribió (sirve para mostrar el nombre y para saber si lo puede borrar)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autor_id", nullable = false, updatable = false)
    private Usuario autor;

    // Puede quedar vacío si el comentario es solo de fotos
    @Column(length = MAX_TEXTO, updatable = false)
    private String texto;

    // Hora en que se escribió en el celular (puede ser bastante antes de que llegue, si no había señal)
    @Column(name = "hecho_en", nullable = false, updatable = false)
    private OffsetDateTime hechoEn;

    // Hora en que llegó al servidor
    @Column(name = "recibido_en", nullable = false, updatable = false)
    private LocalDateTime recibidoEn;

    // Las fotos del comentario, en el orden en que se eligieron.
    // cascade + orphanRemoval: se guardan y se borran junto con el comentario.
    @OneToMany(mappedBy = "comentario", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("posicion ASC")
    private List<FotoComentario> fotos = new ArrayList<>();

    @PrePersist
    void alRecibir() {
        recibidoEn = LocalDateTime.now();
    }

    // JPA necesita un constructor vacío para poder armar el objeto cuando lee de la base
    protected ComentarioOrden() {
    }

    private ComentarioOrden(UUID operacionId, OrdenTrabajo orden, Usuario autor, String texto, OffsetDateTime hechoEn) {
        this.operacionId = operacionId;
        this.orden = orden;
        this.autor = autor;
        this.texto = texto;
        this.hechoEn = hechoEn;
    }

    /**
     * Arma un comentario nuevo. El texto se guarda sin espacios de más; si queda vacío, se guarda como null.
     * (Las reglas, como "texto o al menos una foto", las controla el service.)
     */
    public static ComentarioOrden nuevo(UUID operacionId, OrdenTrabajo orden, Usuario autor, String texto,
                                        OffsetDateTime hechoEn) {
        String limpio = texto == null || texto.isBlank() ? null : texto.strip();
        return new ComentarioOrden(operacionId, orden, autor, limpio, hechoEn);
    }

    /** Suma una foto al final. Su nombre en el almacén sale del número de comanda y de su posición. */
    public FotoComentario agregarFoto(String tipoContenido, long tamanio) {
        int posicion = fotos.size();
        FotoComentario foto = new FotoComentario(this, FotoComentario.archivoDe(operacionId, posicion, tipoContenido),
                tipoContenido, tamanio, posicion);
        fotos.add(foto);
        return foto;
    }

    // Getters (sin setters: un comentario no se edita)
    public Long getId() { return id; }
    public UUID getOperacionId() { return operacionId; }
    public OrdenTrabajo getOrden() { return orden; }
    public Usuario getAutor() { return autor; }
    public String getTexto() { return texto; }
    public OffsetDateTime getHechoEn() { return hechoEn; }
    public LocalDateTime getRecibidoEn() { return recibidoEn; }
    public List<FotoComentario> getFotos() { return Collections.unmodifiableList(fotos); }

    // Solo para los tests: en la aplicación el id lo pone la base y la fecha alRecibir()
    public void setId(Long id) { this.id = id; }
    public void setRecibidoEn(LocalDateTime recibidoEn) { this.recibidoEn = recibidoEn; }
}
