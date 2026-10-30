package com.faro.backend.services;

import com.faro.backend.models.AccionAuditoria;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RegistroAuditoriaWriterTest {

    @Test
    void insertaAccionYCapturasEnLaTablaDeAuditoria() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        RegistroAuditoriaWriter writer = new RegistroAuditoriaWriter(jdbcTemplate);

        writer.registrar(AccionAuditoria.MODIFICACION, "OrdenTrabajo", 12L,
                "ana@faro.gob.ar", "{\"descripcion\":\"antes\"}", "{\"descripcion\":\"después\"}");

        ArgumentCaptor<Object[]> captor = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(contains("INSERT INTO registros_auditoria"), captor.capture());
        Object[] argumentos = captor.getValue();
        assertEquals("MODIFICACION", argumentos[0]);
        assertEquals("OrdenTrabajo", argumentos[1]);
        assertEquals("12", argumentos[2]);
        assertEquals("ana@faro.gob.ar", argumentos[3]);
        assertNotNull(argumentos[4]);
        assertEquals("{\"descripcion\":\"antes\"}", argumentos[5]);
        assertEquals("{\"descripcion\":\"después\"}", argumentos[6]);
    }
}
