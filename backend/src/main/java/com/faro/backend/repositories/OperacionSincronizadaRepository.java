package com.faro.backend.repositories;

import com.faro.backend.models.OperacionSincronizada;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** La "despensa" de las operaciones que llegaron sin señal. Se buscan por su número de comanda (UUID). */
public interface OperacionSincronizadaRepository extends JpaRepository<OperacionSincronizada, UUID> {
}
