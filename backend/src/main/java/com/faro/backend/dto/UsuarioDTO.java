package com.faro.backend.dto;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Datos de perfil del usuario del sistema")
public record UsuarioDTO(
        @Schema(description = "Identificador único del usuario", example = "1")
        Long id,

        @Schema(description = "Nombre de pila", example = "Martín")
        String nombre,

        @Schema(description = "Apellido", example = "Gómez")
        String apellido,

        @Schema(description = "Correo electrónico institucional", example = "encargado@generalpaz.gob.ar")
        String email,

        @Schema(description = "Rol asignado dentro del municipio", example = "ENCARGADO_CORRALON")
        RolUsuario rol,

        @Schema(description = "Identificador de la cuadrilla asignada si es capataz, o null", example = "null")
        Long cuadrillaId,

        @Schema(description = "Indica si el usuario se encuentra habilitado para operar", example = "true")
        boolean activo
) {
    public static UsuarioDTO desdeEntidad(Usuario usuario) {
        return new UsuarioDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getRol(),
                usuario.getCuadrillaId(),
                usuario.isActivo()
        );
    }
}
