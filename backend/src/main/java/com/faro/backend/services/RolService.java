package com.faro.backend.services;

import com.faro.backend.dto.PermisoDTO;
import com.faro.backend.dto.RolDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Permiso;
import com.faro.backend.models.RolUsuario;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class RolService {

    public List<RolDTO> listarRoles() {
        return Arrays.stream(RolUsuario.values())
                .map(RolDTO::desdeEnum)
                .toList();
    }

    public RolDTO obtenerRol(String codigo) {
        try {
            RolUsuario rol = RolUsuario.valueOf(codigo.toUpperCase().trim());
            return RolDTO.desdeEnum(rol);
        } catch (IllegalArgumentException e) {
            throw new RecursoNoEncontradoException("No existe el rol especificado: " + codigo);
        }
    }

    public List<PermisoDTO> listarPermisos() {
        return Arrays.stream(Permiso.values())
                .map(PermisoDTO::desdeEnum)
                .toList();
    }
}
