package com.faro.backend.models;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PermisoTest {

    @Test
    void todosLosPermisosTienenNombreVisibleYDescripcion() {
        for (Permiso permiso : Permiso.values()) {
            assertNotNull(permiso.getNombreVisible());
            assertFalse(permiso.getNombreVisible().isBlank());
            assertNotNull(permiso.getDescripcion());
            assertFalse(permiso.getDescripcion().isBlank());
        }
    }
}
