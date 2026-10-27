package com.faro.backend.dto;

import com.faro.backend.models.Permiso;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PermisoDTOTest {

    @Test
    void desdeEnumMapeaCampos() {
        PermisoDTO dto = PermisoDTO.desdeEnum(Permiso.GESTIONAR_USUARIOS);

        assertEquals("GESTIONAR_USUARIOS", dto.codigo());
        assertEquals("Gestionar usuarios", dto.nombre());
        assertEquals(Permiso.GESTIONAR_USUARIOS.getDescripcion(), dto.descripcion());
    }
}
