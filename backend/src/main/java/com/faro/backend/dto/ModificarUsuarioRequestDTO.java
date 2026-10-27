package com.faro.backend.dto;

import com.faro.backend.models.RolUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Datos para la modificación de un usuario existente")
public record ModificarUsuarioRequestDTO(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        @Schema(description = "Nombre de pila", example = "Martín")
        String nombre,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres")
        @Schema(description = "Apellido", example = "Gómez")
        String apellido,

        @NotBlank(message = "El correo electrónico es obligatorio")
        @Email(message = "El correo electrónico debe ser una dirección válida")
        @Size(max = 150, message = "El correo electrónico no puede superar los 150 caracteres")
        @Schema(description = "Correo electrónico institucional", example = "encargado@generalpaz.gob.ar")
        String email,

        @Size(min = 6, message = "La nueva contraseña debe tener al menos 6 caracteres")
        @Schema(description = "Nueva contraseña opcional (si se omite o viaja vacía se conserva la actual)", example = "NuevaClave2026!")
        String password,

        @NotNull(message = "El rol es obligatorio")
        @Schema(description = "Rol asignado dentro del municipio", example = "ENCARGADO_CORRALON")
        RolUsuario rol,

        @Schema(description = "Identificador de la cuadrilla (si el rol es CAPATAZ_CUADRILLA)", example = "1")
        Long cuadrillaId,

        @Schema(description = "Estado de habilitación del usuario", example = "true")
        Boolean activo
) {
}
