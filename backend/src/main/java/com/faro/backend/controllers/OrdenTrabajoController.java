package com.faro.backend.controllers;

import com.faro.backend.dto.AsignarCuadrillaRequestDTO;
import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.services.OrdenTrabajoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    @ResponseStatus(HttpStatus.CREATED) // responde 201 en vez de 200
    @Operation(summary = "Crear una orden de trabajo")
    public OrdenTrabajoDTO crear(@Valid @RequestBody OrdenTrabajoRequestDTO request) {
        return service.crear(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modificar una orden de trabajo")
    public OrdenTrabajoDTO modificar(@PathVariable Long id, @Valid @RequestBody OrdenTrabajoRequestDTO request) {
        return service.modificar(id, request);
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Cambiar el estado de una orden de trabajo",
            description = "Solo se permite si existe el camino entre el estado actual y el nuevo (si no, responde 409).")
    public OrdenTrabajoDTO cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambioEstadoRequestDTO request) {
        return service.cambiarEstado(id, request);
    }

    @PatchMapping("/{id}/cuadrilla")
    @Operation(summary = "Asignar cuadrilla a una orden de trabajo",
            description = "Asigna la OT a una cuadrilla disponible y la avanza al estado En curso.")
    public OrdenTrabajoDTO asignarCuadrilla(@PathVariable Long id, @Valid @RequestBody AsignarCuadrillaRequestDTO request) {
        return service.asignarCuadrilla(id, request.cuadrillaId());
    }
}