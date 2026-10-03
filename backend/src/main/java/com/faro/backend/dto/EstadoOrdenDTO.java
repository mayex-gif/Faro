package com.faro.backend.dto;

import java.util.List;

/**
 * Un estado tal como lo ve la pantalla, con los estados a los que se puede pasar desde él.
 * Ej: { id: 1, nombre: "Pendiente", ..., siguientes: [2, 3, 5] }
 */
public record EstadoOrdenDTO(
        Long id,
        String nombre,
        String color,
        boolean inicial,
        boolean cierre,
        List<Long> siguientes // ids de los estados a los que se puede ir desde este
) {}