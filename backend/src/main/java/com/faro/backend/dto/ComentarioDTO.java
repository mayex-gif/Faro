package com.faro.backend.dto;

import com.faro.backend.models.ComentarioOrden;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Schema(description = "Un mensaje del muro \"Comentarios y fotos\" de una orden de trabajo")
public record ComentarioDTO(
        @Schema(description = "Identificador del comentario", example = "4")
        Long id,

        @Schema(description = "Número de operación que inventó el celular (UUID)", example = "3f2a8c1e-7b0d-4c55-9e1a-2b6f0c9d8e71")
        UUID operacionId,

        @Schema(description = "Orden de trabajo del comentario", example = "7")
        Long ordenId,

        @Schema(description = "Quién lo escribió (id)", example = "3")
        Long autorId,

        @Schema(description = "Quién lo escribió (nombre y apellido)", example = "Carlos Rodríguez")
        String autorNombre,

        @Schema(description = "Rol de quien lo escribió", example = "CAPATAZ_CUADRILLA")
        RolUsuario autorRol,

        @Schema(description = "Texto (vacío si el comentario es solo de fotos)", example = "Se cambió la lámpara del poste 3")
        String texto,

        @Schema(description = "Cuándo se escribió en el celular", example = "2026-11-08T10:15:00-03:00")
        OffsetDateTime hechoEn,

        @Schema(description = "Cuándo llegó al servidor", example = "2026-11-08T10:42:10")
        LocalDateTime recibidoEn,

        @Schema(description = "Fotos, en orden")
        List<FotoDTO> fotos,

        @Schema(description = "Si la persona que consulta lo puede borrar (es quien lo escribió o es el encargado)", example = "true")
        boolean puedeBorrar
) {
    public static ComentarioDTO desdeEntidad(ComentarioOrden comentario, boolean puedeBorrar) {
        Usuario autor = comentario.getAutor();
        return new ComentarioDTO(
                comentario.getId(),
                comentario.getOperacionId(),
                comentario.getOrden().getId(),
                autor.getId(),
                autor.getNombre() + " " + autor.getApellido(),
                autor.getRol(),
                comentario.getTexto(),
                comentario.getHechoEn(),
                comentario.getRecibidoEn(),
                comentario.getFotos().stream().map(FotoDTO::desdeEntidad).toList(),
                puedeBorrar);
    }
}
