package com.faro.backend.controllers;

import com.faro.backend.dto.HistoriaLugarDTO;
import com.faro.backend.services.HistoriaLugarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/infraestructura")
@Tag(name = "Ficha Histórica", description = "Historia de cada lugar: sus órdenes de trabajo y todo lo que les pasó")
public class HistoriaLugarController {

    private final HistoriaLugarService service;

    public HistoriaLugarController(HistoriaLugarService service) {
        this.service = service;
    }

    @GetMapping("/{id}/historia")
    @Operation(summary = "Ver la historia de un lugar",
            description = "Devuelve los datos del lugar, un resumen de sus OT y la línea de tiempo de eventos "
                    + "(OT creada, cambio de estado, cuadrilla asignada), del más nuevo al más viejo. "
                    + "Responde 404 si el lugar no existe.")
    public HistoriaLugarDTO obtenerHistoria(@PathVariable Long id) {
        return service.obtenerHistoria(id);
    }
}