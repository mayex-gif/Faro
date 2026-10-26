package com.faro.backend.dto;

import com.faro.backend.models.RolUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Datos para dar de alta a una persona del personal (la "comanda" del alta). */
@Schema(description = "Datos para dar de alta un usuario")
public record UsuarioAltaRequestDTO(

        @Schema(example = "Lucía")
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String nombre,

        @Schema(example = "Fernández")
        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres")
        String apellido,

        @Schema(example = "lucia.fernandez@generalpaz.gob.ar")
        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email,

        @Schema(example = "CAPATAZ_CUADRILLA")
        @NotNull(message = "El rol es obligatorio")
        RolUsuario rol,

        @Schema(description = "Cuadrilla a cargo: obligatoria si el rol es CAPATAZ_CUADRILLA; para los otros roles se ignora", example = "1")
        Long cuadrillaId,

        @Schema(description = "Clave inicial (la escribe quien da el alta). Nunca se devuelve.")
        @NotBlank(message = "La clave inicial es obligatoria")
        @Size(min = 8, max = 72, message = "La clave tiene que tener entre 8 y 72 caracteres")
        String clave
) {}
