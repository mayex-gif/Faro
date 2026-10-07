package com.faro.backend.controllers;

import com.faro.backend.dto.EstadoOrdenDTO;
import com.faro.backend.services.EstadoOrdenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/estados-orden")
@Tag(name = "Estados de OT", description = "Estados posibles de una Orden de Trabajo y caminos permitidos entre ellos")
public class EstadoOrdenController {

    private final EstadoOrdenService service;

    public EstadoOrdenController(EstadoOrdenService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar estados",
            description = "Devuelve los estados en orden. Cada uno trae 'siguientes': los ids de los estados a los que se puede pasar.")
    public List<EstadoOrdenDTO> listar() {
        return service.listar();
    }
}