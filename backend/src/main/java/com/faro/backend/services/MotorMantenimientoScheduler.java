package com.faro.backend.services;

import com.faro.backend.dto.GeneracionOrdenesResultadoDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Tarea programada (CRON Job en Spring Boot) para autogenerar las Órdenes de Trabajo
 * periódicas según las reglas de recurrencia activas en el municipio.
 * Configurable mediante la propiedad: faro.mantenimiento.cron
 */
@Component
@ConditionalOnProperty(name = "faro.mantenimiento.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class MotorMantenimientoScheduler {

    private static final Logger log = LoggerFactory.getLogger(MotorMantenimientoScheduler.class);

    private final MotorMantenimientoService motorMantenimientoService;

    public MotorMantenimientoScheduler(MotorMantenimientoService motorMantenimientoService) {
        this.motorMantenimientoService = motorMantenimientoService;
    }

    /**
     * Se ejecuta periódicamente según la expresión CRON (por defecto: todos los días a las 06:00 hs).
     */
    @Scheduled(cron = "${faro.mantenimiento.cron:0 0 6 * * *}")
    public void ejecutarAutogeneracionProgramada() {
        LocalDate hoy = LocalDate.now();
        log.info("Iniciando tarea programada de generación de OT periódicas para la fecha {}", hoy);

        try {
            GeneracionOrdenesResultadoDTO resultado = motorMantenimientoService.generarOrdenesPendientes(hoy);
            log.info("Tarea programada finalizada con éxito: evaluadas {} reglas, generadas {} órdenes de trabajo.",
                    resultado.reglasEvaluadas(), resultado.ordenesGeneradas());
        } catch (Exception e) {
            log.error("Error durante la ejecución de la tarea programada de mantenimiento: {}", e.getMessage(), e);
        }
    }
}
