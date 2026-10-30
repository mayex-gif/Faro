package com.faro.backend.dto;

import java.util.List;

/** Página estable de resultados de auditoría, con la información de navegación. */
public record PaginaAuditoriaDTO(
        List<RegistroAuditoriaDTO> registros,
        int pagina,
        int tamanio,
        long totalRegistros,
        int totalPaginas,
        boolean primera,
        boolean ultima
) {
}
