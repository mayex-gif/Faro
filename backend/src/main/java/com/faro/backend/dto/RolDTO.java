package com.faro.backend.dto;

import com.faro.backend.models.RolUsuario;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Set;
import java.util.stream.Collectors;

@Schema(description = "Detalle del rol municipal y su conjunto de permisos asignados en el corralón")
public record RolDTO(
        @Schema(description = "Identificador o código del rol", example = "ENCARGADO_CORRALON")
        String codigo,

        @Schema(description = "Nombre legible del rol", example = "Encargado del corralón")
        String nombre,

        @Schema(description = "Descripción de las responsabilidades del rol", example = "Administración operativa general...")
        String descripcion,

        @Schema(description = "Conjunto de permisos otorgados en el corralón")
        Set<String> permisos
) {
    public static RolDTO desdeEnum(RolUsuario rol) {
        return new RolDTO(
                rol.name(),
                rol.getNombreVisible(),
                rol.getDescripcion(),
                rol.getPermisos().stream().map(Enum::name).collect(Collectors.toSet())
        );
    }
}
