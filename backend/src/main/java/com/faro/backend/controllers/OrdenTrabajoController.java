package com.faro.backend.controllers;

import com.faro.backend.config.security.UsuarioDetalles;
import com.faro.backend.dto.AsignarCuadrillaRequestDTO;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.services.OrdenTrabajoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Órdenes de Trabajo (OT).
 * Consultar: cualquier usuario con sesión iniciada.
 * Crear: encargado del corralón y mesa de entradas (ej.: al recibir un reclamo).
 * Modificar, asignar y reasignar cuadrilla: solo el encargado del corralón.
 * Cambiar el estado: el encargado (cualquier orden) y el capataz (solo las de su cuadrilla: lo controla el service).
 * Si el rol no alcanza, @PreAuthorize corta antes de llegar al service y responde 403.
 */
@RestController
@RequestMapping("/api/ordenes-trabajo")
@Tag(name = "Órdenes de Trabajo", description = "Creación, edición y consulta de Órdenes de Trabajo (OT)")
public class OrdenTrabajoController {

    private final OrdenTrabajoService service;

    public OrdenTrabajoController(OrdenTrabajoService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar órdenes de trabajo",
            description = "Devuelve todas las OT, de la más nueva a la más vieja. Con ?lugarId=X devuelve solo las de ese lugar.")
    public List<OrdenTrabajoDTO> listar(@RequestParam(required = false) Long lugarId) {
        return (lugarId == null) ? service.listar() : service.listarPorLugar(lugarId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Ver una orden de trabajo")
    public OrdenTrabajoDTO obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ENCARGADO_CORRALON', 'MESA_ENTRADAS')")
    @ResponseStatus(HttpStatus.CREATED) // responde 201 en vez de 200
    @Operation(summary = "Crear una orden de trabajo")
    public OrdenTrabajoDTO crear(@Valid @RequestBody OrdenTrabajoRequestDTO request) {
        return service.crear(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Modificar una orden de trabajo")
    public OrdenTrabajoDTO modificar(@PathVariable Long id, @Valid @RequestBody OrdenTrabajoRequestDTO request) {
        return service.modificar(id, request);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ENCARGADO_CORRALON', 'CAPATAZ_CUADRILLA')")
    @Operation(summary = "Cambiar el estado de una orden de trabajo",
            description = "Solo se permite si existe el camino entre el estado actual y el nuevo (si no, responde 409). "
                    + "El capataz solo puede cambiar las órdenes de su cuadrilla (si no, responde 403).")
    public OrdenTrabajoDTO cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambioEstadoRequestDTO request,
                                         @Parameter(hidden = true) @AuthenticationPrincipal UsuarioDetalles usuario) {
        // @AuthenticationPrincipal: Spring nos da el usuario que mandó el token (quién pide el plato)
        return service.cambiarEstado(id, request, usuario.getUsuario());
    }

    @PatchMapping("/{id}/cuadrilla")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Asignar cuadrilla a una orden de trabajo",
            description = "Asigna la OT a una cuadrilla disponible y la avanza al estado En curso.")
    public OrdenTrabajoDTO asignarCuadrilla(@PathVariable Long id, @Valid @RequestBody AsignarCuadrillaRequestDTO request) {
        return service.asignarCuadrilla(id, request.cuadrillaId());
    }

    @PatchMapping("/{id}/reasignacion")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Reasignar una orden de trabajo a otra cuadrilla",
            description = "Pasa una OT que ya tiene cuadrilla (y no está cerrada) a otra cuadrilla disponible "
                    + "que realice ese tipo de trabajo. El estado de la OT no cambia.")
    public OrdenTrabajoDTO reasignarCuadrilla(@PathVariable Long id, @Valid @RequestBody AsignarCuadrillaRequestDTO request) {
        return service.reasignarCuadrilla(id, request.cuadrillaId());
    }
}