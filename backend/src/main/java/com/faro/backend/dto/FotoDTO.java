package com.faro.backend.dto;

import com.faro.backend.models.FotoComentario;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Una foto de un comentario (la imagen se baja aparte, con sesión iniciada, desde \"url\")")
public record FotoDTO(
        @Schema(description = "Identificador de la foto", example = "12")
        Long id,

        @Schema(description = "Tipo de imagen", example = "image/jpeg")
        String tipoContenido,

        @Schema(description = "Tamaño en bytes", example = "245120")
        long tamanio,

        @Schema(description = "Orden dentro del comentario (0 = la primera)", example = "0")
        int posicion,

        @Schema(description = "Dirección para bajar la imagen (pide el header Authorization)", example = "/api/comentarios/fotos/12")
        String url
) {
    public static FotoDTO desdeEntidad(FotoComentario foto) {
        return new FotoDTO(foto.getId(), foto.getTipoContenido(), foto.getTamanio(), foto.getPosicion(),
                "/api/comentarios/fotos/" + foto.getId());
    }
}
