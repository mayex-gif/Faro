package com.faro.backend.services;

import com.faro.backend.dto.PuntoInfraestructuraDTO;
import com.faro.backend.dto.PuntoInfraestructuraRequestDTO;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PuntoInfraestructuraService {

        private final PuntoInfraestructuraRepository repository;
    private final OrdenTrabajoRepository ordenRepository;

    public PuntoInfraestructuraService(PuntoInfraestructuraRepository repository,
                                       OrdenTrabajoRepository ordenRepository) {
        this.repository = repository;
        this.ordenRepository = ordenRepository;
    }

    @Transactional(readOnly = true)
    public List<PuntoInfraestructuraDTO> obtenerTodos() {
        return repository.findAll().stream()
                .map(this::convertirADto)
                .collect(Collectors.toList());
    }

    // Método listo para consumir la consulta espacial de PostGIS
    @Transactional(readOnly = true)
    public List<PuntoInfraestructuraDTO> obtenerInfraestructuraActiva(String tipo) {
        return repository.findByTipoAndEstadoOperativo(tipo, true).stream()
                .map(this::convertirADto)
                .collect(Collectors.toList());
    }

    private PuntoInfraestructuraDTO convertirADto(PuntoInfraestructura entidad) {
        return new PuntoInfraestructuraDTO(
                entidad.getId(),
                entidad.getNombre(),
                entidad.getTipo(),
                entidad.getDatosTecnicos(),
                entidad.getEstadoOperativo(),
                entidad.getUbicacion()
        );
    }
    // Método para ALTA (Crear)
    @Transactional
    public PuntoInfraestructuraDTO crearLugar(PuntoInfraestructuraRequestDTO request) {
        PuntoInfraestructura nuevoLugar = new PuntoInfraestructura();
        nuevoLugar.setNombre(request.nombre());
        nuevoLugar.setTipo(request.tipo());
        nuevoLugar.setDatosTecnicos(request.datosTecnicos());
        nuevoLugar.setEstadoOperativo(request.estadoOperativo());
        nuevoLugar.setUbicacion(request.ubicacion());

        PuntoInfraestructura guardado = repository.save(nuevoLugar);
        return convertirADto(guardado);
    }

    // Método para MODIFICACIÓN (Editar)
    @Transactional
    public PuntoInfraestructuraDTO modificarLugar(Long id, PuntoInfraestructuraRequestDTO request) {
        PuntoInfraestructura existente = repository.findById(id)
                                .orElseThrow(() -> new RecursoNoEncontradoException("Lugar no encontrado"));

        existente.setNombre(request.nombre());
        existente.setTipo(request.tipo());
        existente.setDatosTecnicos(request.datosTecnicos());
        existente.setEstadoOperativo(request.estadoOperativo());
        existente.setUbicacion(request.ubicacion());

        PuntoInfraestructura actualizado = repository.save(existente);
        return convertirADto(actualizado);
    }

        // Método para BAJA (Eliminar)
    @Transactional
    public void eliminarLugar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNoEncontradoException("Lugar no encontrado");
        }
        // La historia de un lugar no se borra: si tiene OT, no se puede eliminar
        if (ordenRepository.existsByLugarId(id)) {
            throw new OperacionNoPermitidaException(
                    "No se puede borrar el lugar porque tiene órdenes de trabajo asociadas");
        }
        repository.deleteById(id);
    }
}