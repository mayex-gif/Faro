package com.faro.backend.models;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class RolUsuarioTest {

    @Test
    void encargadoCorralonPoseeTodosLosPermisos() {
        RolUsuario rol = RolUsuario.ENCARGADO_CORRALON;
        Set<Permiso> permisos = rol.getPermisos();

        assertNotNull(permisos);
        assertEquals(Permiso.values().length, permisos.size());
        assertTrue(rol.tienePermiso(Permiso.GESTIONAR_USUARIOS));
        assertTrue(rol.tienePermiso(Permiso.ASIGNAR_CUADRILLA));
        assertTrue(rol.tienePermiso(Permiso.ELIMINAR_INFRAESTRUCTURA));
        assertNotNull(rol.getNombreVisible());
        assertNotNull(rol.getDescripcion());
    }

    @Test
    void capatazCuadrillaPoseePermisosOperativosEnCalle() {
        RolUsuario rol = RolUsuario.CAPATAZ_CUADRILLA;
        Set<Permiso> permisos = rol.getPermisos();

        assertTrue(permisos.contains(Permiso.CONSULTAR_TAREAS_PROPIAS));
        assertTrue(permisos.contains(Permiso.CAMBIAR_ESTADO_ORDEN));
        assertTrue(permisos.contains(Permiso.CONSULTAR_MAPA));
        assertTrue(permisos.contains(Permiso.CONSULTAR_HISTORIAL));

        assertFalse(rol.tienePermiso(Permiso.GESTIONAR_USUARIOS));
        assertFalse(rol.tienePermiso(Permiso.ASIGNAR_CUADRILLA));
        assertFalse(rol.tienePermiso(Permiso.CREAR_ORDEN));
    }

    @Test
    void mesaEntradasPoseePermisosDeAtencionYReclamos() {
        RolUsuario rol = RolUsuario.MESA_ENTRADAS;
        Set<Permiso> permisos = rol.getPermisos();

        assertTrue(permisos.contains(Permiso.CREAR_ORDEN));
        assertTrue(permisos.contains(Permiso.GESTIONAR_INFRAESTRUCTURA));
        assertTrue(permisos.contains(Permiso.CONSULTAR_MAPA));
        assertTrue(permisos.contains(Permiso.CONSULTAR_HISTORIAL));

        assertFalse(rol.tienePermiso(Permiso.GESTIONAR_USUARIOS));
        assertFalse(rol.tienePermiso(Permiso.ASIGNAR_CUADRILLA));
        assertFalse(rol.tienePermiso(Permiso.ELIMINAR_INFRAESTRUCTURA));
    }
}
