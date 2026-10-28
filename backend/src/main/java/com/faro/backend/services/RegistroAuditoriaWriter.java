package com.faro.backend.services;

import com.faro.backend.models.AccionAuditoria;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** Persiste la bitácora con la conexión de la transacción que modificó el dato. */
@Component
public class RegistroAuditoriaWriter {

    private static final String INSERTAR = """
            INSERT INTO registros_auditoria
                (accion, tipo_registro, registro_id, actor, fecha, valores_anteriores, valores_nuevos)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;

    private final JdbcTemplate jdbcTemplate;

    public RegistroAuditoriaWriter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void registrar(AccionAuditoria accion, String tipoRegistro, Object registroId, String actor,
                          String valoresAnteriores, String valoresNuevos) {
        jdbcTemplate.update(INSERTAR, accion.name(), tipoRegistro, String.valueOf(registroId), actor,
                LocalDateTime.now(), valoresAnteriores, valoresNuevos);
    }
}
