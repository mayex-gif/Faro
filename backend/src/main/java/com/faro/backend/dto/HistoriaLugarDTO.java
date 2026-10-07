package com.faro.backend.dto;

import java.util.List;

/**
 * La Ficha Histórica de un lugar: sus datos, un resumen de sus OT
 * y todos sus eventos, del más nuevo al más viejo.
 */
public record HistoriaLugarDTO(
        Long lugarId,
        String nombre,
        String tipo,
        String datosTecnicos,
        Boolean estadoOperativo,
        long totalOrdenes,
        long ordenesAbiertas,   // las que todavía no llegaron a un estado de cierre
        long ordenesCerradas,   // Finalizadas o Canceladas
        List<EventoHistoriaDTO> eventos
) {}