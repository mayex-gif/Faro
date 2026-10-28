package com.faro.backend.controllers;

import com.faro.backend.dto.*;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.ReglaMantenimiento;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.services.CalculoDesvioService;
import com.faro.backend.services.MotorMantenimientoService;
import com.faro.backend.services.ReglaMantenimientoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controlador REST para el Motor de Mantenimiento Periódico.
 * Permite configurar reglas de recurrencia (diaria, semanal, mensual),
 * autogenerar Órdenes de Trabajo periódicas y medir desvíos (planificado vs ejecutado).
 */
@RestController
@RequestMapping("/api/mantenimiento-reglas")
@Tag(name = "Mantenimiento Periódico", description = "Reglas de recurrencia periódica, generación de OT y cálculo de desvíos")
public class ReglaMantenimientoController {

    private final ReglaMantenimientoService reglaService;
    private final MotorMantenimientoService motorService;
    private final CalculoDesvioService desvioService;
    private final OrdenTrabajoRepository ordenRepository;

    public ReglaMantenimientoController(ReglaMantenimientoService reglaService,
                                        MotorMantenimientoService motorService,
                                        CalculoDesvioService desvioService,
                                        OrdenTrabajoRepository ordenRepository) {
        this.reglaService = reglaService;
        this.motorService = motorService;
        this.desvioService = desvioService;
        this.ordenRepository = ordenRepository;
    }

    @GetMapping
    @Operation(summary = "Listar reglas de mantenimiento periódico",
            description = "Devuelve todas las reglas de mantenimiento. Permite filtrar por estado (activa) y/o lugar.")
    public List<ReglaMantenimientoDTO> listar(@RequestParam(required = false) Boolean activa,
                                              @RequestParam(required = false) Long lugarId) {
        return reglaService.listar(activa, lugarId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Ver detalle de una regla de mantenimiento")
    public ReglaMantenimientoDTO obtener(@PathVariable Long id) {
        return reglaService.obtener(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear una regla de mantenimiento periódico",
            description = "Configura una regla de recurrencia (diaria, semanal, mensual) para generar OT automáticas.")
    public ReglaMantenimientoDTO crear(@Valid @RequestBody ReglaMantenimientoRequestDTO request) {
        return reglaService.crear(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Modificar una regla de mantenimiento periódico")
    public ReglaMantenimientoDTO modificar(@PathVariable Long id,
                                          @Valid @RequestBody ReglaMantenimientoRequestDTO request) {
        return reglaService.modificar(id, request);
    }

    @PatchMapping("/{id}/pausar")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Pausar una regla de mantenimiento periódico",
            description = "Desactiva la regla para que el motor programado no genere nuevas OT mientras esté pausada.")
    public ReglaMantenimientoDTO pausar(@PathVariable Long id) {
        return reglaService.pausar(id);
    }

    @PatchMapping("/{id}/activar")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Activar una regla de mantenimiento periódico",
            description = "Reanuda una regla previamente pausada, recalculando la fecha de ejecución vigente si quedó en el pasado.")
    public ReglaMantenimientoDTO activar(@PathVariable Long id) {
        return reglaService.activar(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar una regla de mantenimiento periódico",
            description = "Elimina la regla si aún no tiene órdenes de trabajo generadas. Si ya tiene OT, debe pausarse.")
    public void eliminar(@PathVariable Long id) {
        reglaService.eliminar(id);
    }

    @PostMapping("/ejecutar-pendientes")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Disparar generación manual de órdenes pendientes",
            description = "Ejecuta de forma inmediata la evaluación del motor para autogenerar las OT de todas las reglas activas que estén vencidas a la fecha.")
    public GeneracionOrdenesResultadoDTO ejecutarPendientes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return motorService.generarOrdenesPendientes(fecha != null ? fecha : LocalDate.now());
    }

    @PostMapping("/{id}/ejecutar")
    @PreAuthorize("hasRole('ENCARGADO_CORRALON')")
    @Operation(summary = "Disparar generación inmediata de una regla de mantenimiento",
            description = "Fuerza la creación inmediata de la siguiente Orden de Trabajo para esta regla específica y avanza su fecha de recurrencia.")
    public OrdenTrabajoDTO ejecutarRegla(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return motorService.ejecutarReglaManualmente(id, fecha != null ? fecha : LocalDate.now());
    }

    @GetMapping("/{id}/desvios")
    @Operation(summary = "Calcular desvíos de una regla de mantenimiento",
            description = "Compara las fechas planificadas vs ejecutadas de todas las OT generadas por esta regla, midiendo retrasos, adelantos y cumplimiento.")
    public ResumenDesviosDTO desviosPorRegla(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaReferencia) {
        ReglaMantenimiento regla = reglaService.buscarRegla(id);
        List<OrdenTrabajo> ordenes = ordenRepository.findByReglaMantenimientoIdOrderByFechaPlanificadaDesc(id);
        return desvioService.calcularResumen(regla.getId(), regla.getTitulo(), ordenes,
                fechaReferencia != null ? fechaReferencia : LocalDate.now());
    }

    @GetMapping("/desvios")
    @Operation(summary = "Reporte global de desvíos de mantenimiento periódico",
            description = "Consolidado a nivel municipal de todas las OT de mantenimiento periódico generadas: planificado vs ejecutado, promedio de desvío en días y porcentaje de cumplimiento.")
    public ResumenDesviosDTO desviosGlobales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaReferencia) {
        List<OrdenTrabajo> ordenes = ordenRepository.findByReglaMantenimientoIsNotNullOrderByFechaPlanificadaDesc();
        return desvioService.calcularResumen(null, "Consolidado Municipal de Mantenimiento", ordenes,
                fechaReferencia != null ? fechaReferencia : LocalDate.now());
    }
}
