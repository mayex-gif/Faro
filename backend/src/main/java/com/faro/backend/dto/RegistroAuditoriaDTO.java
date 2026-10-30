package com.faro.backend.dto;

import com.faro.backend.models.AccionAuditoria;
import java.time.LocalDateTime;
import java.util.Map;

/** Una acción de auditoría lista para consultar desde clientes del backend. */
public record RegistroAuditoriaDTO(
        Long id,
        AccionAuditoria accion,
        String tipoRegistro,
        String registroId,
        String actor,
        LocalDateTime fecha,
        Map<String, Object> valoresAnteriores,
        Map<String, Object> valoresNuevos
) {
}
