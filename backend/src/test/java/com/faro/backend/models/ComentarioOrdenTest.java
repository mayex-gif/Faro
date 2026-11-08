package com.faro.backend.models;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Prueba cómo se arma un comentario y el nombre de sus fotos en el almacén. */
class ComentarioOrdenTest {

    private static final UUID COMANDA = UUID.fromString("3f2a8c1e-0000-4000-8000-000000000001");
    private static final OffsetDateTime HECHO_EN = OffsetDateTime.parse("2026-11-08T10:15:00-03:00");

    private final OrdenTrabajo orden = new OrdenTrabajo();
    private final Usuario autor = new Usuario();

    @Test
    void nuevo_guardaTodoYElTextoSinEspaciosDeMas() {
        ComentarioOrden comentario = ComentarioOrden.nuevo(COMANDA, orden, autor, "  Se cambió la lámpara  ", HECHO_EN);

        assertThat(comentario.getOperacionId()).isEqualTo(COMANDA);
        assertThat(comentario.getOrden()).isSameAs(orden);
        assertThat(comentario.getAutor()).isSameAs(autor);
        assertThat(comentario.getTexto()).isEqualTo("Se cambió la lámpara");
        assertThat(comentario.getHechoEn()).isEqualTo(HECHO_EN);
        assertThat(comentario.getFotos()).isEmpty();
    }

    @Test
    void nuevo_sinTexto_loGuardaVacio() {
        assertThat(ComentarioOrden.nuevo(COMANDA, orden, autor, null, HECHO_EN).getTexto()).isNull();
        assertThat(ComentarioOrden.nuevo(COMANDA, orden, autor, "   ", HECHO_EN).getTexto()).isNull();
    }

    @Test
    void alRecibir_lePoneLaHoraDeLlegada() {
        ComentarioOrden comentario = ComentarioOrden.nuevo(COMANDA, orden, autor, "Hola", HECHO_EN);

        comentario.alRecibir();

        assertThat(comentario.getRecibidoEn()).isNotNull();
    }

    @Test
    void agregarFoto_numeraLasFotosEnOrdenYLesDaSuNombreEnElAlmacen() {
        ComentarioOrden comentario = ComentarioOrden.nuevo(COMANDA, orden, autor, null, HECHO_EN);

        FotoComentario primera = comentario.agregarFoto("image/jpeg", 250_000);
        FotoComentario segunda = comentario.agregarFoto("image/png", 90_000);

        assertThat(comentario.getFotos()).containsExactly(primera, segunda);
        assertThat(primera.getComentario()).isSameAs(comentario);
        assertThat(primera.getPosicion()).isZero();
        assertThat(primera.getArchivo()).isEqualTo("comentarios/" + COMANDA + "/0.jpg");
        assertThat(primera.getTipoContenido()).isEqualTo("image/jpeg");
        assertThat(primera.getTamanio()).isEqualTo(250_000);
        assertThat(segunda.getPosicion()).isEqualTo(1);
        assertThat(segunda.getArchivo()).isEqualTo("comentarios/" + COMANDA + "/1.png");
    }

    @Test
    void getFotos_noSePuedeCambiarDesdeAfuera() {
        ComentarioOrden comentario = ComentarioOrden.nuevo(COMANDA, orden, autor, "Hola", HECHO_EN);

        assertThatThrownBy(() -> comentario.getFotos().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void archivoDe_usaLaExtensionDelTipoDeImagen() {
        assertThat(FotoComentario.archivoDe(COMANDA, 2, "image/webp")).isEqualTo("comentarios/" + COMANDA + "/2.webp");
        assertThat(FotoComentario.archivoDe(COMANDA, 0, "image/jpeg")).endsWith("/0.jpg");
        assertThat(FotoComentario.archivoDe(COMANDA, 0, "image/png")).endsWith("/0.png");
    }

    @Test
    void settersDePrueba_ponenIdYFecha() {
        ComentarioOrden comentario = ComentarioOrden.nuevo(COMANDA, orden, autor, "Hola", HECHO_EN);
        FotoComentario foto = comentario.agregarFoto("image/jpeg", 1);

        comentario.setId(7L);
        comentario.setRecibidoEn(java.time.LocalDateTime.of(2026, 11, 8, 10, 20));
        foto.setId(9L);

        assertThat(comentario.getId()).isEqualTo(7L);
        assertThat(comentario.getRecibidoEn()).isEqualTo(java.time.LocalDateTime.of(2026, 11, 8, 10, 20));
        assertThat(foto.getId()).isEqualTo(9L);
    }
}
