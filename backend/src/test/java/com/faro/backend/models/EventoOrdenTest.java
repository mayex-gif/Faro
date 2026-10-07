package com.faro.backend.models;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/** Prueba que cada "fábrica" arme bien su renglón de bitácora. */
class EventoOrdenTest {

    private final OrdenTrabajo orden = new OrdenTrabajo();
    private final EstadoOrden pendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
    private final EstadoOrden enCurso = new EstadoOrden("En curso", "#9A4A12", false, false, 3);

    @Test
    void cambioDeEstadoGuardaLosDosEstadosYNingunaCuadrilla() {
        EventoOrden evento = EventoOrden.cambioDeEstado(orden, pendiente, enCurso);

        assertSame(orden, evento.getOrden());
        assertEquals(TipoEventoOrden.CAMBIO_ESTADO, evento.getTipo());
        assertSame(pendiente, evento.getEstadoAnterior());
        assertSame(enCurso, evento.getEstadoNuevo());
        assertNull(evento.getCuadrilla());
    }

    @Test
    void asignacionDeCuadrillaGuardaLaCuadrillaYLosEstados() {
        Cuadrilla verde = new Cuadrilla();
        verde.setNombre("Cuadrilla Verde");

        EventoOrden evento = EventoOrden.asignacionDeCuadrilla(orden, verde, pendiente, enCurso);

        assertEquals(TipoEventoOrden.CUADRILLA_ASIGNADA, evento.getTipo());
        assertSame(verde, evento.getCuadrilla());
        assertSame(pendiente, evento.getEstadoAnterior());
        assertSame(enCurso, evento.getEstadoNuevo());
    }

    @Test
    void alRegistrarLePoneLaFechaDeAhora() {
        EventoOrden evento = EventoOrden.cambioDeEstado(orden, pendiente, enCurso);
        LocalDateTime antes = LocalDateTime.now();

        evento.alRegistrar(); // es lo que hace JPA solo, justo antes de guardar

        assertNotNull(evento.getFecha());
        assertFalse(evento.getFecha().isBefore(antes));
        assertFalse(evento.getFecha().isAfter(LocalDateTime.now()));
    }

    @Test
    void losSettersDeTestCambianIdYFecha() {
        EventoOrden evento = EventoOrden.cambioDeEstado(orden, pendiente, enCurso);
        LocalDateTime fecha = LocalDateTime.of(2026, 10, 7, 15, 30);

        evento.setId(5L);
        evento.setFecha(fecha);

        assertEquals(5L, evento.getId());
        assertEquals(fecha, evento.getFecha());
    }
}