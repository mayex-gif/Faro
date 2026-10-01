package com.faro.backend.repositories;

import com.faro.backend.models.OrdenTrabajo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrdenTrabajoRepository extends JpaRepository<OrdenTrabajo, Long> {

    // Todas las OT de un lugar, de la más nueva a la más vieja.
    // Spring arma la consulta SOLO, a partir del nombre del método.
    List<OrdenTrabajo> findByLugarIdOrderByFechaCreacionDesc(Long lugarId);

    // ¿Este lugar tiene alguna OT? (lo vamos a usar para no borrar lugares con historia)
    boolean existsByLugarId(Long lugarId);
}