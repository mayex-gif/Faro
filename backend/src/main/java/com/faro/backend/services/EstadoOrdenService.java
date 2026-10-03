package com.faro.backend.services;

import com.faro.backend.dto.EstadoOrdenDTO;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.TransicionEstado;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Consulta de los estados configurados y de los caminos permitidos entre ellos. */
@Service
public class EstadoOrdenService {

    private final EstadoOrdenRepository estadoRepository;
    private final TransicionEstadoRepository transicionRepository;

    public EstadoOrdenService(EstadoOrdenRepository estadoRepository,
                              TransicionEstadoRepository transicionRepository) {
        this.estadoRepository = estadoRepository;
        this.transicionRepository = transicionRepository;
    }

    /** Todos los estados, en orden, cada uno con la lista de estados a los que se puede pasar. */
    @Transactional(readOnly = true)
    public List<EstadoOrdenDTO> listar() {
        // Agrupamos todas las transiciones por estado de origen:
        // { 1 -> [2, 3, 5], 2 -> [3, 1, 5], 3 -> [4, 5] }
        Map<Long, List<Long>> siguientesPorEstado = transicionRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        (TransicionEstado t) -> t.getOrigen().getId(),
                        Collectors.mapping(t -> t.getDestino().getId(), Collectors.toList())));

        return estadoRepository.findAllByOrderByPosicionAsc().stream()
                .map(estado -> convertirADto(estado, siguientesPorEstado.getOrDefault(estado.getId(), List.of())))
                .toList();
    }

    private EstadoOrdenDTO convertirADto(EstadoOrden estado, List<Long> siguientes) {
        return new EstadoOrdenDTO(estado.getId(), estado.getNombre(), estado.getColor(),
                estado.isInicial(), estado.isCierre(), siguientes);
    }
}