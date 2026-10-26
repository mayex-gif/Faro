package com.faro.backend.services;

import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.repositories.UsuarioRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lógica de negocio de la gestión de usuarios (el personal que entra a FARO).
 * Nunca devuelve la clave: todo sale como UsuarioDTO.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Lista todo el personal (activos y dados de baja), ordenado por apellido y nombre. */
    @Transactional(readOnly = true)
    public List<UsuarioDTO> listar() {
        return usuarioRepository.findAll(Sort.by("apellido", "nombre")).stream()
                .map(UsuarioDTO::desdeEntidad)
                .toList();
    }
}