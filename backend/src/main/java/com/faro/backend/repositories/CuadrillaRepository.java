package com.faro.backend.repositories;

import com.faro.backend.models.Cuadrilla;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CuadrillaRepository extends JpaRepository<Cuadrilla, Long> {
    Optional<Cuadrilla> findByNombre(String nombre);
}
