package com.faro.backend.repositories;

import com.faro.backend.models.FotoComentario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** La "despensa" de las fotos (solo sus etiquetas: los bytes están en el almacén S3). */
public interface FotoComentarioRepository extends JpaRepository<FotoComentario, Long> {

    // Para mostrar una foto hay que saber de qué OT es (y de qué cuadrilla), así se revisa si la persona la puede ver
    @EntityGraph(attributePaths = {"comentario", "comentario.orden", "comentario.orden.cuadrilla"})
    Optional<FotoComentario> findConOrdenById(Long id);
}
