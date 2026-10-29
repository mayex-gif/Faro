package com.faro.backend.repositories;

import com.faro.backend.models.ReglaMantenimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReglaMantenimientoRepository extends JpaRepository<ReglaMantenimiento, Long> {

    // Reglas activas cuya próxima ejecución debe realizarse en o antes de la fecha indicada
    List<ReglaMantenimiento> findByActivaTrueAndProximaEjecucionLessThanEqual(LocalDate fecha);

    // Listar por estado activa
    List<ReglaMantenimiento> findByActiva(boolean activa);

    // Listar por lugar
    List<ReglaMantenimiento> findByLugarId(Long lugarId);

    // Listar por lugar y activa
    List<ReglaMantenimiento> findByLugarIdAndActiva(Long lugarId, boolean activa);

    // Comprobar si hay reglas asociadas a un lugar
    boolean existsByLugarId(Long lugarId);
}
