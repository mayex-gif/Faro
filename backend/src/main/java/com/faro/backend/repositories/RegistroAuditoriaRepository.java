package com.faro.backend.repositories;

import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.models.RegistroAuditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface RegistroAuditoriaRepository extends JpaRepository<RegistroAuditoria, Long> {

    @Query("""
            SELECT registro FROM RegistroAuditoria registro
            WHERE (:accion IS NULL OR registro.accion = :accion)
              AND (:tipoRegistro IS NULL OR registro.tipoRegistro = :tipoRegistro)
              AND (:registroId IS NULL OR registro.registroId = :registroId)
              AND (:actor IS NULL OR LOWER(registro.actor) LIKE LOWER(CONCAT(CONCAT('%', :actor), '%')))
              AND (:desde IS NULL OR registro.fecha >= :desde)
              AND (:hasta IS NULL OR registro.fecha <= :hasta)
            """)
    Page<RegistroAuditoria> buscar(@Param("accion") AccionAuditoria accion,
                                   @Param("tipoRegistro") String tipoRegistro,
                                   @Param("registroId") String registroId,
                                   @Param("actor") String actor,
                                   @Param("desde") LocalDateTime desde,
                                   @Param("hasta") LocalDateTime hasta,
                                   Pageable pageable);
}
