package com.faro.backend.controllers;

import com.faro.backend.dto.PuntoInfraestructuraDTO;
import com.faro.backend.dto.PuntoInfraestructuraRequestDTO;
import com.faro.backend.services.PuntoInfraestructuraService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/infraestructura")
@Tag(name = "Infraestructura", description = "ABM de Puntos de Infraestructura (Espacios verdes, calles, luminarias)") // Documentación Swagger
public class PuntoInfraestructuraController {

    private final PuntoInfraestructuraService service;

    public PuntoInfraestructuraController(PuntoInfraestructuraService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Obtener todos los lugares", description = "Devuelve el listado completo de infraestructura mapeada en formato GeoJSON para el mapa interactivo.")
    public ResponseEntity<List<PuntoInfraestructuraDTO>> obtenerTodos() {
        return ResponseEntity.ok(service.obtenerTodos());
    }

    @GetMapping("/activos")
    @Operation(summary = "Filtrar infraestructura activa", description = "Filtra lugares por su tipo (ej. LUMINARIA) que se encuentren en estado operativo funcional.")
    public ResponseEntity<List<PuntoInfraestructuraDTO>> obtenerActivos(@RequestParam String tipo) {
        return ResponseEntity.ok(service.obtenerInfraestructuraActiva(tipo));
    }
    @PostMapping
    @Operation(summary = "Registrar un nuevo lugar", description = "Crea un nuevo punto de infraestructura (espacio verde, calle o luminaria) geolocalizado.")
    public ResponseEntity<PuntoInfraestructuraDTO> crear(@RequestBody PuntoInfraestructuraRequestDTO request) {
        return ResponseEntity.ok(service.crearLugar(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modificar un lugar existente", description = "Actualiza los datos técnicos o el estado operativo de un lugar.")
    public ResponseEntity<PuntoInfraestructuraDTO> actualizar(@PathVariable Long id, @RequestBody PuntoInfraestructuraRequestDTO request) {
        return ResponseEntity.ok(service.modificarLugar(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar un lugar", description = "Elimina un punto de infraestructura del sistema.")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminarLugar(id);
        return ResponseEntity.noContent().build();
    }
}