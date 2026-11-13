package com.faro.backend.repositories;

import com.faro.backend.models.RegistroAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * La "despensa" de la bitácora de auditoría.
 * La búsqueda con filtros se arma en AuditoriaConsultaService con una Specification: solo se agregan
 * a la consulta los filtros que la persona completó. (Antes era una consulta fija con
 * "(:filtro IS NULL OR ...)", y Postgres fallaba con "function lower(bytea) does not exist"
 * porque no sabe de qué tipo es un parámetro vacío.)
 */
public interface RegistroAuditoriaRepository extends JpaRepository<RegistroAuditoria, Long>,
        JpaSpecificationExecutor<RegistroAuditoria> {
}
