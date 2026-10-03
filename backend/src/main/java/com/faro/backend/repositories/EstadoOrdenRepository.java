package com.faro.backend.repositories;

import com.faro.backend.models.EstadoOrden;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EstadoOrdenRepository extends JpaRepository<EstadoOrden, Long> {

    // Todos los estados en el orden en que se muestran en pantalla
    List<EstadoOrden> findAllByOrderByPosicionAsc();

    // El estado en el que arrancan las OT nuevas
    Optional<EstadoOrden> findFirstByInicialTrue();
}