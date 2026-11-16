package com.faro.backend.services;

import tools.jackson.databind.json.JsonMapper;
import com.faro.backend.dto.PaginaAuditoriaDTO;
import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.models.RegistroAuditoria;
import com.faro.backend.repositories.RegistroAuditoriaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuditoriaConsultaServiceTest {

    private final RegistroAuditoriaRepository repository = mock(RegistroAuditoriaRepository.class);
    private final AuditoriaConsultaService service = new AuditoriaConsultaService(repository, JsonMapper.builder().build());

    @Test
    void filtraNormalizaYDevuelveLosMetadatosDePaginacion() {
        LocalDateTime desde = LocalDateTime.of(2026, 10, 1, 0, 0);
        LocalDateTime hasta = LocalDateTime.of(2026, 10, 31, 23, 59);
        RegistroAuditoria registro = mock(RegistroAuditoria.class);
        when(registro.getId()).thenReturn(9L);
        when(registro.getAccion()).thenReturn(AccionAuditoria.MODIFICACION);
        when(registro.getTipoRegistro()).thenReturn("OrdenTrabajo");
        when(registro.getRegistroId()).thenReturn("42");
        when(registro.getActor()).thenReturn("ana@faro.gob.ar");
        when(registro.getFecha()).thenReturn(desde.plusDays(1));
        when(registro.getValoresAnteriores()).thenReturn("{\"estado\":\"Pendiente\"}");
        when(registro.getValoresNuevos()).thenReturn("{\"estado\":\"Finalizada\"}");
        Pageable paginaEsperada = PageRequest.of(1, 10,
                Sort.by(Sort.Order.desc("fecha"), Sort.Order.desc("id")));
        when(repository.findAll(anySpecification(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.nCopies(5, registro), paginaEsperada, 15));

        PaginaAuditoriaDTO resultado = service.buscar(AccionAuditoria.MODIFICACION,
                " OrdenTrabajo ", " 42 ", " ana ", desde, hasta, 1, 10);

        assertEquals(1, resultado.pagina());
        assertEquals(10, resultado.tamanio());
        assertEquals(15, resultado.totalRegistros());
        assertEquals(2, resultado.totalPaginas());
        assertTrue(resultado.ultima());
        assertEquals("OrdenTrabajo", resultado.registros().get(0).tipoRegistro());
        assertEquals("Finalizada", resultado.registros().get(0).valoresNuevos().get("estado"));
        verify(repository).findAll(anySpecification(), eq(paginaEsperada));
    }

    @Test
    void convierteFiltrosEnBlancoANulosYDevuelvePaginaVacia() {
        Pageable pageable = PageRequest.of(0, 20,
                Sort.by(Sort.Order.desc("fecha"), Sort.Order.desc("id")));
        when(repository.findAll(anySpecification(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        PaginaAuditoriaDTO resultado = service.buscar(null, " ", "", null,
                null, null, 0, 20);

        assertTrue(resultado.registros().isEmpty());
        assertEquals(0, resultado.totalRegistros());
        assertTrue(resultado.primera());
        assertTrue(resultado.ultima());
        verify(repository).findAll(anySpecification(), eq(pageable));
    }

    @Test
    void conservaComoTextoUnaCapturaHistoricaQueNoSeaJsonValido() {
        RegistroAuditoria registro = mock(RegistroAuditoria.class);
        when(registro.getValoresNuevos()).thenReturn("captura antigua");
        Pageable pageable = PageRequest.of(0, 20,
                Sort.by(Sort.Order.desc("fecha"), Sort.Order.desc("id")));
        when(repository.findAll(anySpecification(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(registro), pageable, 1));

        PaginaAuditoriaDTO resultado = service.buscar(null, null, null, null, null, null, 0, 20);

        assertEquals("captura antigua", resultado.registros().get(0).valoresNuevos().get("captura"));
    }

    @SuppressWarnings("unchecked")
    private static Specification<RegistroAuditoria> anySpecification() {
        return any(Specification.class);
    }

    // ---------- Qué filtros llegan a la consulta (lo que arreglaba el 500 de Postgres) ----------

    @SuppressWarnings("unchecked")
    private final Root<RegistroAuditoria> registro = mock(Root.class);
    private final CriteriaQuery<?> consulta = mock(CriteriaQuery.class);
    private final CriteriaBuilder cb = mock(CriteriaBuilder.class);

    private Predicate[] condicionesDe(Specification<RegistroAuditoria> filtros) {
        when(registro.get(anyString())).thenReturn(mock(Path.class));
        ArgumentCaptor<Predicate[]> condiciones = ArgumentCaptor.forClass(Predicate[].class);
        when(cb.and(condiciones.capture())).thenReturn(mock(Predicate.class));
        filtros.toPredicate(registro, consulta, cb);
        return condiciones.getValue();
    }

    @Test
    void sinFiltros_laConsultaNoLlevaNingunaCondicion() {
        Predicate[] condiciones = condicionesDe(AuditoriaConsultaService.filtros(null, null, null, null, null, null));

        assertEquals(0, condiciones.length); // nada de "(:filtro IS NULL OR ...)": Postgres no tiene que adivinar tipos
        verify(cb, org.mockito.Mockito.never()).lower(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void conTodosLosFiltros_llevaUnaCondicionPorCadaUno() {
        LocalDateTime desde = LocalDateTime.of(2026, 10, 1, 0, 0);
        LocalDateTime hasta = LocalDateTime.of(2026, 10, 31, 23, 59);
        Expression<String> enMinusculas = mock(Expression.class);
        when(cb.lower(any())).thenReturn(enMinusculas);

        Predicate[] condiciones = condicionesDe(AuditoriaConsultaService.filtros(AccionAuditoria.ELIMINACION,
                "ComentarioOrden", "4", "Ana", desde, hasta));

        assertEquals(6, condiciones.length);
        verify(cb).equal(any(), eq(AccionAuditoria.ELIMINACION));
        verify(cb).equal(any(), eq("ComentarioOrden"));
        verify(cb).equal(any(), eq("4"));
        verify(cb).like(enMinusculas, "%ana%"); // "contiene", sin importar mayúsculas
        verify(cb).greaterThanOrEqualTo(any(Expression.class), eq(desde));
        verify(cb).lessThanOrEqualTo(any(Expression.class), eq(hasta));
    }
}
