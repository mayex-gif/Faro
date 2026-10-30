package com.faro.backend.repositories;

import com.faro.backend.models.OrdenTrabajo;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrdenTrabajoRepository extends JpaRepository<OrdenTrabajo, Long> {

    // Todas las OT de un lugar, de la más nueva a la más vieja.
    // Spring arma la consulta SOLO, a partir del nombre del método.
    List<OrdenTrabajo> findByLugarIdOrderByFechaCreacionDesc(Long lugarId);

    // ¿Este lugar tiene alguna OT? (lo vamos a usar para no borrar lugares con historia)
    boolean existsByLugarId(Long lugarId);
    
    // Las OT que todavía no tienen estado (las creadas antes de que existieran los estados)
    List<OrdenTrabajo> findByEstadoIsNull();

    // Busca la OT y la "agarra" hasta que termine la transacción (SELECT ... FOR UPDATE).
    // Si dos cambios de la misma OT llegan a la vez, el segundo espera al primero y ve cómo quedó:
    // así siempre gana el que llegó primero (la regla de los cambios hechos sin señal).
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from OrdenTrabajo o where o.id = :id")
    Optional<OrdenTrabajo> buscarParaCambiar(@Param("id") Long id);

    // Órdenes generadas por una regla de mantenimiento periódico
    List<OrdenTrabajo> findByReglaMantenimientoIdOrderByFechaPlanificadaDesc(Long reglaId);

    // Todas las órdenes de trabajo que pertenecen a planes de mantenimiento periódicos
    List<OrdenTrabajo> findByReglaMantenimientoIsNotNullOrderByFechaPlanificadaDesc();

    // Para evitar duplicación de OT para una misma regla y fecha planificada
    boolean existsByReglaMantenimientoIdAndFechaPlanificada(Long reglaId, LocalDate fechaPlanificada);

    // ¿Esta regla tiene alguna OT generada?
    boolean existsByReglaMantenimientoId(Long reglaId);
}
