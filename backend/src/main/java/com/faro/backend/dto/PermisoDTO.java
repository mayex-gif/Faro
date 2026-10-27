package com.faro.backend.dto;

import com.faro.backend.models.Permiso;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Detalle de un permiso de operación en el corralón")
public record PermisoDTO(
        @Schema(description = "Código del permiso", example = "GESTIONAR_USUARIOS")
        String codigo,

        @Schema(description = "Nombre legible del permiso", example = "Gestionar usuarios")
        String nombre,

        @Schema(description = "Descripción detallada del alcance del permiso", example = "Crear, modificar, dar de baja y administrar cuentas...")
        String descripcion
) {
    public static PermisoDTO desdeEnum(Permiso permiso) {
        return new PermisoDTO(
                permiso.name(),
                permiso.getNombreVisible(),
                permiso.getDescripcion()
        );
    }
}
