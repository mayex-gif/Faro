package com.faro.backend.models;

import java.util.Set;

/**
 * Roles del sistema FARO para el control de accesos y responsabilidades
 * dentro del municipio de Estación General Paz.
 */
public enum RolUsuario {
    ENCARGADO_CORRALON(
            "Encargado del corralón",
            "Administración operativa general del corralón: gestión de infraestructura, asignación de cuadrillas, control de órdenes y usuarios"
    ),
    CAPATAZ_CUADRILLA(
            "Capataz de cuadrilla",
            "Coordinación operativa en calle: consulta de tareas asignadas a su cuadrilla y avance de su ciclo de vida"
    ),
    MESA_ENTRADAS(
            "Mesa de entradas",
            "Atención vecinal e ingreso de reclamos: creación de órdenes de trabajo y registro inicial de nuevos puntos en el mapa"
    );

    private final String nombreVisible;
    private final String descripcion;

    RolUsuario(String nombreVisible, String descripcion) {
        this.nombreVisible = nombreVisible;
        this.descripcion = descripcion;
    }

    public String getNombreVisible() {
        return nombreVisible;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public Set<Permiso> getPermisos() {
        return switch (this) {
            case ENCARGADO_CORRALON -> Set.of(Permiso.values());
            case CAPATAZ_CUADRILLA -> Set.of(
                    Permiso.CONSULTAR_TAREAS_PROPIAS,
                    Permiso.CAMBIAR_ESTADO_ORDEN,
                    Permiso.CONSULTAR_MAPA,
                    Permiso.CONSULTAR_HISTORIAL
            );
            case MESA_ENTRADAS -> Set.of(
                    Permiso.CREAR_ORDEN,
                    Permiso.GESTIONAR_INFRAESTRUCTURA,
                    Permiso.CONSULTAR_MAPA,
                    Permiso.CONSULTAR_HISTORIAL
            );
        };
    }

    public boolean tienePermiso(Permiso permiso) {
        return getPermisos().contains(permiso);
    }
}
