package com.faro.backend.models;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class RegistroAuditoriaTest {

    @Test
    void exponeLosDatosInmutablesDeLaAccionAuditada() {
        LocalDateTime fecha = LocalDateTime.of(2026, 10, 28, 10, 30);
        RegistroAuditoria registro = new RegistroAuditoria(AccionAuditoria.MODIFICACION,
                "OrdenTrabajo", "42", "ana@faro.gob.ar", fecha,
                "{\"estado\":\"Pendiente\"}", "{\"estado\":\"Finalizada\"}");

        assertNull(registro.getId());
        assertEquals(AccionAuditoria.MODIFICACION, registro.getAccion());
        assertEquals("OrdenTrabajo", registro.getTipoRegistro());
        assertEquals("42", registro.getRegistroId());
        assertEquals("ana@faro.gob.ar", registro.getActor());
        assertEquals(fecha, registro.getFecha());
        assertEquals("{\"estado\":\"Pendiente\"}", registro.getValoresAnteriores());
        assertEquals("{\"estado\":\"Finalizada\"}", registro.getValoresNuevos());
    }
}
