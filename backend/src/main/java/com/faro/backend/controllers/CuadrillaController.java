package com.faro.backend.controllers;

import com.faro.backend.dto.CuadrillaDTO;
import com.faro.backend.services.CuadrillaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cuadrillas")
@Tag(name = "Cuadrillas", description = "Consulta de cuadrillas municipales y su disponibilidad")
public class CuadrillaController {

    private final CuadrillaService service;

    public CuadrillaController(CuadrillaService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar cuadrillas",
            description = "Devuelve todas las cuadrillas registradas con sus tareas y estado de disponibilidad.")
    public List<CuadrillaDTO> listar() {
        return service.listar();
    }
}
