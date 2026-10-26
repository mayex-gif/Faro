package com.faro.backend.controllers;

import com.faro.backend.config.security.UsuarioDetalles;
import com.faro.backend.dto.CambioActivoRequestDTO;
import com.faro.backend.dto.CambioClaveRequestDTO;
import com.faro.backend.dto.UsuarioAltaRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.dto.UsuarioRequestDTO;
import com.faro.backend.services.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Gestión de usuarios (ABM del personal).
 * Lo pueden usar el encargado del corralón y la mesa de entradas (decisión del equipo, 25/10/2026).
 * El @PreAuthorize está en la clase: vale para todos los endpoints de acá.
 * El capataz recibe 403 y sin sesión iniciada responde 401.
 */
@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasAnyRole('ENCARGADO_CORRALON', 'MESA_ENTRADAS')")
@Tag(name = "Usuarios", description = "Gestión del personal que usa FARO (solo encargado y mesa de entradas)")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar usuarios",
            description = "Devuelve todo el personal (activos y dados de baja), ordenado por apellido. Nunca incluye la clave.")
    public List<UsuarioDTO> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED) // responde 201 en vez de 200
    @Operation(summary = "Dar de alta un usuario",
            description = "Crea la cuenta con una clave inicial. El email no se puede repetir (409). "
                    + "Si el rol es CAPATAZ_CUADRILLA, la cuadrilla es obligatoria y tiene que existir.")
    public UsuarioDTO crear(@Valid @RequestBody UsuarioAltaRequestDTO request) {
        return service.crear(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modificar un usuario",
            description = "Cambia nombre, apellido, email, rol y cuadrilla (la clave no). El email no puede ser de otra persona (409). "
                    + "No se le puede cambiar el rol al último encargado activo (409).")
    public UsuarioDTO modificar(@PathVariable Long id, @Valid @RequestBody UsuarioRequestDTO request) {
        return service.modificar(id, request);
    }

    @PatchMapping("/{id}/activo")
    @Operation(summary = "Dar de baja o reactivar un usuario",
            description = "{ \"activo\": false } da de baja (no puede entrar más, ni con un token viejo); { \"activo\": true } reactiva. "
                    + "No se borra nada. Nadie se puede dar de baja a sí mismo ni al último encargado activo (409).")
    public UsuarioDTO cambiarActivo(@PathVariable Long id, @Valid @RequestBody CambioActivoRequestDTO request,
                                    @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        // @AuthenticationPrincipal: quién hace el pedido (para que nadie se dé de baja a sí mismo)
        return service.cambiarActivo(id, request.activo(), usuario.getUsuario());
    }

    @PatchMapping("/{id}/clave")
    @ResponseStatus(HttpStatus.NO_CONTENT) // 204: salió bien y no hay nada que devolver (la clave nunca se devuelve)
    @Operation(summary = "Restablecer la clave de un usuario",
            description = "Quien la restablece escribe la clave nueva (mínimo 8 caracteres) y se la pasa a la persona.")
    public void restablecerClave(@PathVariable Long id, @Valid @RequestBody CambioClaveRequestDTO request) {
        service.restablecerClave(id, request.clave());
    }
}
