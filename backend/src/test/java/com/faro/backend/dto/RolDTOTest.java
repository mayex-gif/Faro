package com.faro.backend.dto;

import com.faro.backend.models.RolUsuario;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RolDTOTest {

    @Test
    void desdeEnumMapeaCorrectamente() {
        RolDTO dto = RolDTO.desdeEnum(RolUsuario.ENCARGADO_CORRALON);

        assertEquals("ENCARGADO_CORRALON", dto.codigo());
        assertEquals("Encargado del corralón", dto.nombre());
        assertEquals(RolUsuario.ENCARGADO_CORRALON.getDescripcion(), dto.descripcion());
        assertTrue(dto.permisos().contains("GESTIONAR_USUARIOS"));
    }
}
