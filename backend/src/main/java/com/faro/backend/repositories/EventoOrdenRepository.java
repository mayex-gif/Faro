package com.faro.backend.repositories;

import com.faro.backend.models.EventoOrden;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventoOrdenRepository extends JpaRepository<EventoOrden, Long> {

    // Todos los eventos de las OT de un lugar, del más nuevo al más viejo.
    // Spring lee el nombre como un camino: evento → Orden → Lugar → Id
    List<EventoOrden> findByOrdenLugarIdOrderByFechaDesc(Long lugarId);
}