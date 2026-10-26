package com.faro.backend.config.security;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;

/**
 * Usuarios de mentira para los tests de permisos, uno por rol.
 * Se usan con user(...) de spring-security-test: simulan a alguien que ya inició sesión con ese rol.
 */
public final class UsuariosDePrueba {

    private UsuariosDePrueba() {
    }

    public static UsuarioDetalles encargado() {
        return new UsuarioDetalles(new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "clave-hasheada",
                RolUsuario.ENCARGADO_CORRALON, null, true));
    }

    public static UsuarioDetalles mesaDeEntradas() {
        return new UsuarioDetalles(new Usuario("Ana", "Martínez", "mesadeentradas@generalpaz.gob.ar", "clave-hasheada",
                RolUsuario.MESA_ENTRADAS, null, true));
    }

    /** Capataz de la cuadrilla con ese id. */
    public static UsuarioDetalles capataz(Long cuadrillaId) {
        return new UsuarioDetalles(new Usuario("Carlos", "Rodríguez", "capataz.verde@generalpaz.gob.ar", "clave-hasheada",
                RolUsuario.CAPATAZ_CUADRILLA, cuadrillaId, true));
    }
}