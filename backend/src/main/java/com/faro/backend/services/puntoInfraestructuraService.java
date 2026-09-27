package com.faro.backend.services;

import com.faro.backend.dto.PuntoInfraestructuraDTO;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PuntoInfraestructuraService {

    private final PuntoInfraestructuraRepository repository;

    public PuntoInfraestructuraService(PuntoInfraestructuraRepository repository) {
        this.repository = repository;
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
                .orElseThrow(() -> new RuntimeException("Lugar no encontrado"));

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
        repository.deleteById(id);
    }
}