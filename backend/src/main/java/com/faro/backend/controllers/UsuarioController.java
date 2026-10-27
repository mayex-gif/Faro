package com.faro.backend.controllers;

import com.faro.backend.dto.CambiarActivoUsuarioRequestDTO;
import com.faro.backend.dto.CrearUsuarioRequestDTO;
import com.faro.backend.dto.ModificarUsuarioRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.services.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasRole('ENCARGADO_CORRALON')")
@Tag(name = "Usuarios", description = "ABM de usuarios del sistema FARO y asignación de roles/cuadrillas en el corralón")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    @Operation(summary = "Listar usuarios", description = "Devuelve el listado de usuarios con filtros opcionales por rol y estado activo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado obtenido correctamente"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "403", description = "Acceso restringido a Encargado del corralón")
    })
    public ResponseEntity<List<UsuarioDTO>> listar(
            @RequestParam(required = false) RolUsuario rol,
            @RequestParam(required = false) Boolean activo) {
        return ResponseEntity.ok(usuarioService.listar(rol, activo));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener usuario por ID", description = "Devuelve los datos del perfil de un usuario.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario encontrado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<UsuarioDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.obtenerPorId(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear nuevo usuario (Alta)", description = "Da de alta a un operador municipal encriptando su clave con BCrypt y asignando rol.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Usuario creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos de entrada inválidos"),
            @ApiResponse(responseCode = "404", description = "Cuadrilla vinculada no encontrada"),
            @ApiResponse(responseCode = "409", description = "El correo electrónico ya se encuentra registrado")
    })
    public ResponseEntity<UsuarioDTO> crear(@Valid @RequestBody CrearUsuarioRequestDTO request) {
        UsuarioDTO creado = usuarioService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modificar usuario existente (Modificación)", description = "Actualiza datos personales, correo, rol, cuadrilla o contraseña de un usuario.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos de entrada inválidos"),
            @ApiResponse(responseCode = "404", description = "Usuario o cuadrilla no encontrada"),
            @ApiResponse(responseCode = "409", description = "Conflicto por email duplicado o deshabilitación del único encargado")
    })
    public ResponseEntity<UsuarioDTO> modificar(
            @PathVariable Long id,
            @Valid @RequestBody ModificarUsuarioRequestDTO request,
            Principal principal) {
        String emailOperador = (principal != null) ? principal.getName() : null;
        UsuarioDTO modificado = usuarioService.modificar(id, request, emailOperador);
        return ResponseEntity.ok(modificado);
    }

    @PatchMapping("/{id}/activo")
    @Operation(summary = "Cambiar estado activo/inactivo (Baja/Alta lógica)", description = "Habilita o deshabilita la cuenta de un usuario.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Estado del usuario actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos de entrada inválidos"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
            @ApiResponse(responseCode = "409", description = "Conflicto por auto-desactivación o desactivación del único encargado")
    })
    public ResponseEntity<UsuarioDTO> cambiarEstadoActivo(
            @PathVariable Long id,
            @Valid @RequestBody CambiarActivoUsuarioRequestDTO request,
            Principal principal) {
        String emailOperador = (principal != null) ? principal.getName() : null;
        UsuarioDTO actualizado = usuarioService.cambiarEstadoActivo(id, request.activo(), emailOperador);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar usuario (Baja)", description = "Elimina la cuenta de usuario del sistema.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Usuario eliminado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
            @ApiResponse(responseCode = "409", description = "Conflicto por auto-eliminación o eliminación del único encargado")
    })
    public ResponseEntity<Void> eliminar(@PathVariable Long id, Principal principal) {
        String emailOperador = (principal != null) ? principal.getName() : null;
        usuarioService.eliminar(id, emailOperador);
        return ResponseEntity.noContent().build();
    }
}
