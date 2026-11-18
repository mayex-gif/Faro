package com.faro.backend.dto.reportes;

import java.util.List;

/**
 * Sección "Luminarias" del tablero de Reportes: nuevas vs viejas.
 *
 * <p>total: todas las luminarias cargadas (las instaladas de los tres grupos + las a futuro).</p>
 * <p>aFuturo: las planificadas que todavía no se pusieron (no son ni nuevas ni viejas).</p>
 * <p>grupos: siempre tres, en este orden: "nueva", "vieja" y "sinMarcar" (la pantalla oculta "sinMarcar" si está en cero).</p>
 */
public record ResumenLuminariasDTO(
        long total,
        long aFuturo,
        List<GrupoLuminariasDTO> grupos
) {
    public static final List<String> CLAVES = List.of("nueva", "vieja", "sinMarcar");

    /** Sin luminarias cargadas. */
    public static ResumenLuminariasDTO vacio() {
        return new ResumenLuminariasDTO(0, 0, CLAVES.stream().map(GrupoLuminariasDTO::vacio).toList());
    }
}
