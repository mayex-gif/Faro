package com.faro.backend.services;

import com.faro.backend.models.TipoFrecuencia;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;

/**
 * Motor de cálculo de fechas de recurrencia periódica (diaria, semanal, mensual).
 * Resuelve intervalos, días específicos de semana o mes, y ajuste de fin de mes / bisiestos.
 */
@Component
public class CalculadorRecurrencia {

    /**
     * Calcula la primera fecha de ejecución a partir de la fecha de inicio y la configuración de frecuencia.
     */
    public LocalDate calcularPrimeraEjecucion(TipoFrecuencia frecuencia, Integer intervalo,
                                              Integer diaSemana, Integer diaMes, LocalDate fechaInicio) {
        if (fechaInicio == null) {
            fechaInicio = LocalDate.now();
        }
        if (frecuencia == null) {
            return fechaInicio;
        }

        switch (frecuencia) {
            case DIARIA:
                return fechaInicio;

            case SEMANAL:
                if (diaSemana != null && diaSemana >= 1 && diaSemana <= 7) {
                    DayOfWeek deseado = DayOfWeek.of(diaSemana);
                    if (fechaInicio.getDayOfWeek().equals(deseado)) {
                        return fechaInicio;
                    }
                    return fechaInicio.with(TemporalAdjusters.next(deseado));
                }
                return fechaInicio;

            case MENSUAL:
                if (diaMes != null && diaMes >= 1 && diaMes <= 31) {
                    YearMonth ymInicio = YearMonth.from(fechaInicio);
                    int diaAjustado = Math.min(diaMes, ymInicio.lengthOfMonth());
                    LocalDate fechaCandidata = ymInicio.atDay(diaAjustado);
                    if (!fechaCandidata.isBefore(fechaInicio)) {
                        return fechaCandidata;
                    }
                    // Si el día del mes ya pasó en este mes, la primera ejecución es en el mes siguiente
                    YearMonth ymSiguiente = ymInicio.plusMonths(1);
                    return ymSiguiente.atDay(Math.min(diaMes, ymSiguiente.lengthOfMonth()));
                }
                return fechaInicio;

            default:
                return fechaInicio;
        }
    }

    /**
     * Calcula la siguiente fecha de ejecución a partir de la fecha de ejecución anterior/actual.
     */
    public LocalDate calcularSiguiente(TipoFrecuencia frecuencia, int intervalo,
                                       Integer diaSemana, Integer diaMes, LocalDate fechaBase) {
        int paso = Math.max(1, intervalo);
        if (fechaBase == null) {
            fechaBase = LocalDate.now();
        }
        if (frecuencia == null) {
            return fechaBase.plusDays(paso);
        }

        switch (frecuencia) {
            case DIARIA:
                return fechaBase.plusDays(paso);

            case SEMANAL:
                LocalDate fechaAvanzadaSemana = fechaBase.plusWeeks(paso);
                if (diaSemana != null && diaSemana >= 1 && diaSemana <= 7) {
                    DayOfWeek deseado = DayOfWeek.of(diaSemana);
                    // Mantiene el día de la semana solicitado
                    return fechaAvanzadaSemana.with(TemporalAdjusters.nextOrSame(deseado));
                }
                return fechaAvanzadaSemana;

            case MENSUAL:
                YearMonth ymSiguiente = YearMonth.from(fechaBase).plusMonths(paso);
                int diaDeseado;
                if (diaMes != null && diaMes >= 1 && diaMes <= 31) {
                    diaDeseado = diaMes;
                } else {
                    diaDeseado = fechaBase.getDayOfMonth();
                }
                int diaFinal = Math.min(diaDeseado, ymSiguiente.lengthOfMonth());
                return ymSiguiente.atDay(diaFinal);

            default:
                return fechaBase.plusDays(paso);
        }
    }
}
