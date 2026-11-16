package com.faro.backend.models;

import jakarta.persistence.*;

import java.util.UUID;

/**
 * Una foto de un comentario. En la base se guarda solo la "etiqueta" (dónde está y qué es);
 * los bytes de la imagen están en el almacén de fotos (S3), con el nombre "archivo".
 */
@Entity
@Table(name = "fotos_comentario")
public class FotoComentario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comentario_id", nullable = false, updatable = false)
    private ComentarioOrden comentario;

    // El nombre del archivo en el almacén. Ej: "comentarios/3f2a.../0.jpg"
    // (se llama "archivo" y no "clave" para no confundirlo con una contraseña: la auditoría oculta los campos "clave")
    @Column(nullable = false, unique = true, length = 120, updatable = false)
    private String archivo;

    // image/jpeg, image/png o image/webp
    @Column(name = "tipo_contenido", nullable = false, length = 30, updatable = false)
    private String tipoContenido;

    // Tamaño en bytes
    @Column(nullable = false, updatable = false)
    private long tamanio;

    // 0 = la primera foto del comentario, 1 = la segunda...
    @Column(nullable = false, updatable = false)
    private int posicion;

    // JPA necesita un constructor vacío para poder armar el objeto cuando lee de la base
    protected FotoComentario() {
    }

    // Se crea solo desde ComentarioOrden.agregarFoto(...)
    FotoComentario(ComentarioOrden comentario, String archivo, String tipoContenido, long tamanio, int posicion) {
        this.comentario = comentario;
        this.archivo = archivo;
        this.tipoContenido = tipoContenido;
        this.tamanio = tamanio;
        this.posicion = posicion;
    }

    /**
     * Nombre de la foto en el almacén: siempre el mismo para la misma comanda y posición.
     * Así, si el celular reintenta el envío, la foto se vuelve a escribir en el mismo lugar (no queda repetida).
     */
    public static String archivoDe(UUID operacionId, int posicion, String tipoContenido) {
        return "comentarios/" + operacionId + "/" + posicion + "." + extensionDe(tipoContenido);
    }

    static String extensionDe(String tipoContenido) {
        return switch (tipoContenido) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }

    public Long getId() { return id; }
    public ComentarioOrden getComentario() { return comentario; }
    public String getArchivo() { return archivo; }
    public String getTipoContenido() { return tipoContenido; }
    public long getTamanio() { return tamanio; }
    public int getPosicion() { return posicion; }

    // Solo para los tests: en la aplicación el id lo pone la base
    public void setId(Long id) { this.id = id; }
}
