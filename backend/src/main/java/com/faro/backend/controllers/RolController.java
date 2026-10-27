package com.faro.backend.controllers;

import com.faro.backend.dto.PermisoDTO;
import com.faro.backend.dto.RolDTO;
import com.faro.backend.services.RolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@Tag(name = "Roles y Permisos", description = "Consulta del catálogo de roles municipales y permisos de operación en el corralón")
public class RolController {

    private final RolService rolService;

    public RolController(RolService rolService) {
        this.rolService = rolService;
    }

    @GetMapping
    @Operation(summary = "Listar roles", description = "Devuelve todos los roles municipales configurados con sus permisos asociados.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Roles obtenidos correctamente"),
            @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<List<RolDTO>> listarRoles() {
        return ResponseEntity.ok(rolService.listarRoles());
    }

    @GetMapping("/{codigo}")
    @Operation(summary = "Obtener rol por código", description = "Devuelve el detalle de un rol específico y su lista de permisos en el corralón.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rol encontrado"),
            @ApiResponse(responseCode = "404", description = "Rol no encontrado")
    })
    public ResponseEntity<RolDTO> obtenerRol(@PathVariable String codigo) {
        return ResponseEntity.ok(rolService.obtenerRol(codigo));
    }

    @GetMapping("/permisos")
    @Operation(summary = "Listar catálogo de permisos", description = "Devuelve todos los permisos del sistema con sus nombres y descripciones de alcance.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Permisos obtenidos correctamente")
    })
    public ResponseEntity<List<PermisoDTO>> listarPermisos() {
        return ResponseEntity.ok(rolService.listarPermisos());
    }
}
