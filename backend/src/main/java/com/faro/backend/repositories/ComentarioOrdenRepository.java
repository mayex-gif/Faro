package com.faro.backend.repositories;

import com.faro.backend.models.ComentarioOrden;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** La "despensa" de los comentarios de las OT. */
public interface ComentarioOrdenRepository extends JpaRepository<ComentarioOrden, Long> {

    // El muro de una OT, del más nuevo al más viejo.
    // @EntityGraph trae el autor y las fotos en la misma consulta (si no, haría una consulta más por comentario).
    @EntityGraph(attributePaths = {"autor", "fotos"})
    List<ComentarioOrden> findByOrdenIdOrderByHechoEnDescIdDesc(Long ordenId);

    // Para no duplicar: ¿esta comanda del celular ya llegó antes?
    @EntityGraph(attributePaths = {"autor", "fotos"})
    Optional<ComentarioOrden> findByOperacionId(UUID operacionId);
}
