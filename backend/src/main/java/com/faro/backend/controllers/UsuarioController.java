package com.faro.backend.controllers;

import com.faro.backend.dto.UsuarioAltaRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.services.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
}
