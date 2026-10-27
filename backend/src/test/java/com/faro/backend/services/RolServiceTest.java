package com.faro.backend.services;

import com.faro.backend.dto.PermisoDTO;
import com.faro.backend.dto.RolDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.Permiso;
import com.faro.backend.models.RolUsuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RolServiceTest {

    private RolService rolService;

    @BeforeEach
    void setUp() {
        rolService = new RolService();
    }

    @Test
    void listarRolesDevuelveTodosLosRolesDelSistema() {
        List<RolDTO> roles = rolService.listarRoles();

        assertEquals(RolUsuario.values().length, roles.size());
        assertTrue(roles.stream().anyMatch(r -> r.codigo().equals("ENCARGADO_CORRALON")));
        assertTrue(roles.stream().anyMatch(r -> r.codigo().equals("CAPATAZ_CUADRILLA")));
        assertTrue(roles.stream().anyMatch(r -> r.codigo().equals("MESA_ENTRADAS")));
    }

    @Test
    void obtenerRolConCodigoValidoDevuelveRolDTO() {
        RolDTO rol = rolService.obtenerRol("encargado_corralon");

        assertEquals("ENCARGADO_CORRALON", rol.codigo());
        assertEquals("Encargado del corralón", rol.nombre());
        assertTrue(rol.permisos().contains("GESTIONAR_USUARIOS"));
    }

    @Test
    void obtenerRolConCodigoInvalidoLanzaExcepcion() {
        assertThrows(RecursoNoEncontradoException.class, () -> rolService.obtenerRol("ROL_FANTASMA"));
    }

    @Test
    void listarPermisosDevuelveTodosLosPermisosDelSistema() {
        List<PermisoDTO> permisos = rolService.listarPermisos();

        assertEquals(Permiso.values().length, permisos.size());
        assertTrue(permisos.stream().anyMatch(p -> p.codigo().equals("GESTIONAR_USUARIOS")));
    }
}
