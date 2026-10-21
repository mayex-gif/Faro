package com.faro.backend.models;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class UsuarioTest {

    @Test
    void testConstructorVacioYSettersGetters() {
        Usuario usuario = new Usuario();
        usuario.setId(10L);
        usuario.setNombre("Pedro");
        usuario.setApellido("Sánchez");
        usuario.setEmail("pedro@generalpaz.gob.ar");
        usuario.setPassword("claveHash");
        usuario.setRol(RolUsuario.MESA_ENTRADAS);
        usuario.setCuadrillaId(3L);
        usuario.setActivo(false);
        LocalDateTime ahora = LocalDateTime.now();
        usuario.setFechaCreacion(ahora);

        assertEquals(10L, usuario.getId());
        assertEquals("Pedro", usuario.getNombre());
        assertEquals("Sánchez", usuario.getApellido());
        assertEquals("pedro@generalpaz.gob.ar", usuario.getEmail());
        assertEquals("claveHash", usuario.getPassword());
        assertEquals(RolUsuario.MESA_ENTRADAS, usuario.getRol());
        assertEquals(3L, usuario.getCuadrillaId());
        assertFalse(usuario.isActivo());
        assertEquals(ahora, usuario.getFechaCreacion());
    }

    @Test
    void testPrePersistAsignaFechaSiEsNull() {
        Usuario usuario = new Usuario();
        assertNull(usuario.getFechaCreacion());

        usuario.prePersist();
        assertNotNull(usuario.getFechaCreacion());

        LocalDateTime fechaExistente = LocalDateTime.of(2025, 1, 1, 10, 0);
        usuario.setFechaCreacion(fechaExistente);
        usuario.prePersist();
        assertEquals(fechaExistente, usuario.getFechaCreacion());
    }
}
