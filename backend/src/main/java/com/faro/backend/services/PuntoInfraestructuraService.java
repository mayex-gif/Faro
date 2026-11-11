package com.faro.backend.services;

import com.faro.backend.dto.PuntoInfraestructuraDTO;
import com.faro.backend.dto.PuntoInfraestructuraRequestDTO;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PuntoInfraestructuraService {

    /** El único tipo de lugar que puede quedar como "falta poner" (instalada = false). */
    static final String TIPO_LUMINARIA = "LUMINARIA";

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
                entidad.getUbicacion(),
                !Boolean.FALSE.equals(entidad.getInstalada()) // null (lugares viejos) = instalada
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
        nuevoLugar.setInstalada(request.instalada() == null || request.instalada());
        validarInstalada(nuevoLugar);

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
        if (request.instalada() != null) { // si no viene, se deja como estaba
            existente.setInstalada(request.instalada());
        }
        validarInstalada(existente);

        PuntoInfraestructura actualizado = repository.save(existente);
        return convertirADto(actualizado);
    }

    // "Falta poner" solo tiene sentido para una luminaria (una calle o una plaza no "se instalan").
    private void validarInstalada(PuntoInfraestructura lugar) {
        if (Boolean.FALSE.equals(lugar.getInstalada()) && !TIPO_LUMINARIA.equals(lugar.getTipo())) {
            throw new DatoInvalidoException("instalada", "Solo una luminaria puede quedar como \"falta poner\".");
        }
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