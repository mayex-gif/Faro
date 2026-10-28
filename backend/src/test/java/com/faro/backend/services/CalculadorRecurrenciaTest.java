package com.faro.backend.services;

import com.faro.backend.models.TipoFrecuencia;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("Cálculo de fechas de recurrencia periódica")
class CalculadorRecurrenciaTest {

    private CalculadorRecurrencia calculador;

    @BeforeEach
    void setUp() {
        calculador = new CalculadorRecurrencia();
    }

    @Test
    @DisplayName("Recurrencia diaria: avanza los días del intervalo")
    void diariaAvanzaIntervalo() {
        LocalDate inicio = LocalDate.of(2026, 10, 1);
        LocalDate siguiente = calculador.calcularSiguiente(TipoFrecuencia.DIARIA, 1, null, null, inicio);
        assertEquals(LocalDate.of(2026, 10, 2), siguiente);

        LocalDate cadaTresDias = calculador.calcularSiguiente(TipoFrecuencia.DIARIA, 3, null, null, inicio);
        assertEquals(LocalDate.of(2026, 10, 4), cadaTresDias);
    }

    @Test
    @DisplayName("Recurrencia semanal: avanza las semanas del intervalo")
    void semanalAvanzaSemanas() {
        LocalDate lunes = LocalDate.of(2026, 10, 5); // Lunes
        LocalDate siguiente = calculador.calcularSiguiente(TipoFrecuencia.SEMANAL, 1, null, null, lunes);
        assertEquals(LocalDate.of(2026, 10, 12), siguiente);

        LocalDate cadaDosSemanas = calculador.calcularSiguiente(TipoFrecuencia.SEMANAL, 2, null, null, lunes);
        assertEquals(LocalDate.of(2026, 10, 19), cadaDosSemanas);
    }

    @Test
    @DisplayName("Recurrencia semanal con día específico: mantiene el día de la semana pedido")
    void semanalConDiaEspecifico() {
        LocalDate miercoles = LocalDate.of(2026, 10, 7); // Miércoles
        // Pedimos que sea siempre los viernes (5)
        LocalDate primera = calculador.calcularPrimeraEjecucion(TipoFrecuencia.SEMANAL, 1, 5, null, miercoles);
        assertEquals(LocalDate.of(2026, 10, 9), primera); // Viernes 9
        assertEquals(DayOfWeek.FRIDAY, primera.getDayOfWeek());

        LocalDate siguienteViernes = calculador.calcularSiguiente(TipoFrecuencia.SEMANAL, 1, 5, null, primera);
        assertEquals(LocalDate.of(2026, 10, 16), siguienteViernes);
        assertEquals(DayOfWeek.FRIDAY, siguienteViernes.getDayOfWeek());
    }

    @Test
    @DisplayName("Recurrencia mensual: avanza meses respetando el día")
    void mensualAvanzaMeses() {
        LocalDate base = LocalDate.of(2026, 1, 15);
        LocalDate siguiente = calculador.calcularSiguiente(TipoFrecuencia.MENSUAL, 1, null, 15, base);
        assertEquals(LocalDate.of(2026, 2, 15), siguiente);

        LocalDate bimensual = calculador.calcularSiguiente(TipoFrecuencia.MENSUAL, 2, null, 15, base);
        assertEquals(LocalDate.of(2026, 3, 15), bimensual);
    }

    @Test
    @DisplayName("Recurrencia mensual: ajusta al último día en meses más cortos (ej: 31 de enero -> 28 de febrero en año no bisiesto)")
    void mensualAjusteFinDeMes() {
        LocalDate finEnero = LocalDate.of(2026, 1, 31);
        LocalDate febrero = calculador.calcularSiguiente(TipoFrecuencia.MENSUAL, 1, null, 31, finEnero);
        assertEquals(LocalDate.of(2026, 2, 28), febrero);

        // De febrero a marzo con día objetivo 31
        LocalDate marzo = calculador.calcularSiguiente(TipoFrecuencia.MENSUAL, 1, null, 31, febrero);
        assertEquals(LocalDate.of(2026, 3, 31), marzo);
    }

    @Test
    @DisplayName("Recurrencia mensual: primera ejecución si el día solicitado del mes ya pasó")
    void mensualPrimeraEjecucionPasaAlSiguienteMesSiYaVencio() {
        LocalDate inicio = LocalDate.of(2026, 10, 20);
        // Día del mes solicitado: 10 (ya pasó en octubre)
        LocalDate primera = calculador.calcularPrimeraEjecucion(TipoFrecuencia.MENSUAL, 1, null, 10, inicio);
        assertEquals(LocalDate.of(2026, 11, 10), primera);
    }

    @Test
    @DisplayName("Recurrencia mensual: primera ejecución si el día solicitado es hoy o futuro")
    void mensualPrimeraEjecucionEnMismoMesSiEstaEnTermino() {
        LocalDate inicio = LocalDate.of(2026, 10, 5);
        LocalDate primera = calculador.calcularPrimeraEjecucion(TipoFrecuencia.MENSUAL, 1, null, 15, inicio);
        assertEquals(LocalDate.of(2026, 10, 15), primera);
    }
}
