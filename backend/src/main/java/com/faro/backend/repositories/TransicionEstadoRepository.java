package com.faro.backend.repositories;

import com.faro.backend.models.TransicionEstado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransicionEstadoRepository extends JpaRepository<TransicionEstado, Long> {

    // ¿Existe el camino de este estado a este otro? (es la pregunta clave del motor)
    boolean existsByOrigenIdAndDestinoId(Long origenId, Long destinoId);

    // Todos los caminos que salen de un estado (para mostrar los botones "Pasar a...")
    List<TransicionEstado> findByOrigenId(Long origenId);
}