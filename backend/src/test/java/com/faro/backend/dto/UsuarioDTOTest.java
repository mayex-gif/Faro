package com.faro.backend.dto;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class UsuarioDTOTest {

    @Test
    void desdeEntidadMapeaCorrectamenteTodosLosCampos() {
        Usuario usuario = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "pass",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        usuario.setId(1L);
        LocalDateTime ahora = LocalDateTime.now();
        usuario.setFechaCreacion(ahora);

        UsuarioDTO dto = UsuarioDTO.desdeEntidad(usuario);

        assertEquals(1L, dto.id());
        assertEquals("Martín", dto.nombre());
        assertEquals("Gómez", dto.apellido());
        assertEquals("encargado@generalpaz.gob.ar", dto.email());
        assertEquals(RolUsuario.ENCARGADO_CORRALON, dto.rol());
        assertNull(dto.cuadrillaId());
        assertTrue(dto.activo());
        assertEquals(ahora, dto.fechaCreacion());
        assertNotNull(dto.permisos());
        assertTrue(dto.permisos().contains("GESTIONAR_USUARIOS"));
    }

    @Test
    void constructorSecundarioAsignaPermisosSegunRol() {
        UsuarioDTO dto = new UsuarioDTO(2L, "Juan", "Pérez", "juan@generalpaz.gob.ar",
                RolUsuario.CAPATAZ_CUADRILLA, 3L, true);

        assertEquals(2L, dto.id());
        assertEquals(RolUsuario.CAPATAZ_CUADRILLA, dto.rol());
        assertEquals(3L, dto.cuadrillaId());
        assertTrue(dto.permisos().contains("CONSULTAR_TAREAS_PROPIAS"));
    }

    @Test
    void usuarioConRolNullGeneraPermisosVacios() {
        Usuario usuario = new Usuario("Sin", "Rol", "sinrol@generalpaz.gob.ar", "pass",
                null, null, false);
        usuario.setId(3L);

        UsuarioDTO dto = UsuarioDTO.desdeEntidad(usuario);

        assertNull(dto.rol());
        assertNotNull(dto.permisos());
        assertTrue(dto.permisos().isEmpty());

        UsuarioDTO dtoSecundario = new UsuarioDTO(3L, "Sin", "Rol", "sinrol@generalpaz.gob.ar",
                null, null, false);
        assertTrue(dtoSecundario.permisos().isEmpty());
    }
}
