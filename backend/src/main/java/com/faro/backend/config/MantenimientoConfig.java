package com.faro.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Habilita el soporte de tareas programadas (@Scheduled) en Spring Boot
 * para el motor de mantenimiento periódico.
 */
@Configuration
@EnableScheduling
public class MantenimientoConfig {
}
