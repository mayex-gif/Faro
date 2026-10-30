package com.faro.backend.controllers;

import com.faro.backend.dto.PaginaAuditoriaDTO;
import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.services.AuditoriaConsultaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/** API de consulta de trazabilidad, disponible solamente para el encargado del corralón. */
@RestController
@RequestMapping("/api/auditoria")
@PreAuthorize("hasRole('ENCARGADO_CORRALON')")
@Validated
@Tag(name = "Auditoría", description = "Consulta de trazabilidad de los registros clave del sistema")
public class AuditoriaController {

    private final AuditoriaConsultaService service;

    public AuditoriaController(AuditoriaConsultaService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Consultar registros de auditoría",
            description = "Devuelve los cambios más recientes primero. Permite filtrar por acción, entidad, "
                    + "ID del registro, actor y rango de fechas. La página admite entre 1 y 100 resultados.")
    public PaginaAuditoriaDTO buscar(
            @RequestParam(required = false) AccionAuditoria accion,
            @RequestParam(required = false) String tipoRegistro,
            @RequestParam(required = false) String registroId,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.buscar(accion, tipoRegistro, registroId, actor, desde, hasta, page, size);
    }
}
