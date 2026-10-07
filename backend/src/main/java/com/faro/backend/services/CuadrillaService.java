package com.faro.backend.services;

import com.faro.backend.dto.CuadrillaDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.repositories.CuadrillaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lógica de negocio de Cuadrillas: listar y consultar cuadrillas municipales.
 */
@Service
public class CuadrillaService {

    private final CuadrillaRepository cuadrillaRepository;

    public CuadrillaService(CuadrillaRepository cuadrillaRepository) {
        this.cuadrillaRepository = cuadrillaRepository;
    }

    /** Lista todas las cuadrillas. */
    @Transactional(readOnly = true)
    public List<CuadrillaDTO> listar() {
        return cuadrillaRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(this::convertirADto)
                .toList();
    }

    /** Busca una cuadrilla por su ID o lanza 404 si no existe. */
    @Transactional(readOnly = true)
    public Cuadrilla buscar(Long id) {
        return cuadrillaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cuadrilla no encontrada"));
    }

    public CuadrillaDTO convertirADto(Cuadrilla cuadrilla) {
        return new CuadrillaDTO(
                cuadrilla.getId(),
                cuadrilla.getNombre(),
                cuadrilla.getIntegrantes(),
                cuadrilla.getTiposTrabajo().stream().sorted().toList(),
                cuadrilla.isDisponible()
        );
    }
}
