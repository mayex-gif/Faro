package com.faro.backend.services;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.faro.backend.dto.PaginaAuditoriaDTO;
import com.faro.backend.dto.RegistroAuditoriaDTO;
import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.models.RegistroAuditoria;
import com.faro.backend.repositories.RegistroAuditoriaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Consulta paginada y filtrable de la bitácora automática. */
@Service
public class AuditoriaConsultaService {

    private static final Sort ORDEN_MAS_RECIENTE = Sort.by(
            Sort.Order.desc("fecha"), Sort.Order.desc("id"));

    private final RegistroAuditoriaRepository repository;
    private final ObjectMapper objectMapper;

    public AuditoriaConsultaService(RegistroAuditoriaRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PaginaAuditoriaDTO buscar(AccionAuditoria accion, String tipoRegistro, String registroId,
                                    String actor, LocalDateTime desde, LocalDateTime hasta,
                                    int pagina, int tamanio) {
        Page<RegistroAuditoria> resultados = repository.findAll(
                filtros(accion, limpiar(tipoRegistro), limpiar(registroId), limpiar(actor), desde, hasta),
                PageRequest.of(pagina, tamanio, ORDEN_MAS_RECIENTE));
        return new PaginaAuditoriaDTO(
                resultados.getContent().stream().map(this::aDto).toList(),
                resultados.getNumber(),
                resultados.getSize(),
                resultados.getTotalElements(),
                resultados.getTotalPages(),
                resultados.isFirst(),
                resultados.isLast()
        );
    }

    /**
     * Arma el WHERE solo con los filtros que vinieron (los vacíos no se mandan a la base).
     * El actor se busca "contiene", sin importar mayúsculas: "enc" encuentra "encargado@...".
     */
    public static Specification<RegistroAuditoria> filtros(AccionAuditoria accion, String tipoRegistro, String registroId,
                                                    String actor, LocalDateTime desde, LocalDateTime hasta) {
        return (registro, consulta, cb) -> {
            List<jakarta.persistence.criteria.Predicate> condiciones = new ArrayList<>();
            if (accion != null) {
                condiciones.add(cb.equal(registro.get("accion"), accion));
            }
            if (tipoRegistro != null) {
                condiciones.add(cb.equal(registro.get("tipoRegistro"), tipoRegistro));
            }
            if (registroId != null) {
                condiciones.add(cb.equal(registro.get("registroId"), registroId));
            }
            if (actor != null) {
                condiciones.add(cb.like(cb.lower(registro.get("actor")), "%" + actor.toLowerCase(Locale.ROOT) + "%"));
            }
            if (desde != null) {
                condiciones.add(cb.greaterThanOrEqualTo(registro.get("fecha"), desde));
            }
            if (hasta != null) {
                condiciones.add(cb.lessThanOrEqualTo(registro.get("fecha"), hasta));
            }
            return cb.and(condiciones.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private String limpiar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private RegistroAuditoriaDTO aDto(RegistroAuditoria registro) {
        return new RegistroAuditoriaDTO(registro.getId(), registro.getAccion(),
                registro.getTipoRegistro(), registro.getRegistroId(), registro.getActor(),
                registro.getFecha(), parsear(registro.getValoresAnteriores()), parsear(registro.getValoresNuevos()));
    }

    private Map<String, Object> parsear(String valores) {
        if (valores == null) {
            return null;
        }
        try {
            return objectMapper.readValue(valores, new TypeReference<>() { });
        } catch (JacksonException ex) {
            return Map.of("captura", valores);
        }
    }
}
