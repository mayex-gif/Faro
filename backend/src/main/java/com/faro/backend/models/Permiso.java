package com.faro.backend.models;

/**
 * Permisos operativos y administrativos del sistema FARO para el control
 * de responsabilidades en el corralón municipal.
 */
public enum Permiso {
    GESTIONAR_USUARIOS("Gestionar usuarios", "Crear, modificar, dar de baja y administrar cuentas de usuario"),
    GESTIONAR_ROLES("Gestionar roles y permisos", "Consultar y auditar la configuración de roles y sus permisos asociados"),
    CREAR_ORDEN("Crear órdenes de trabajo", "Registrar reclamos vecinales y órdenes de trabajo de mantenimiento"),
    MODIFICAR_ORDEN("Modificar órdenes de trabajo", "Editar descripciones, prioridades y datos técnicos de una orden"),
    ASIGNAR_CUADRILLA("Asignar cuadrillas", "Asignar o reasignar la cuadrilla encargada de ejecutar una orden"),
    CAMBIAR_ESTADO_ORDEN("Cambiar estado de orden", "Avanzar el ciclo de vida de la orden (iniciar, finalizar, cancelar)"),
    GESTIONAR_INFRAESTRUCTURA("Gestionar infraestructura", "Crear y actualizar puntos de infraestructura en el mapa"),
    ELIMINAR_INFRAESTRUCTURA("Eliminar infraestructura", "Eliminar puntos de infraestructura municipal"),
    CONSULTAR_MAPA("Consultar mapa", "Acceder al mapa interactivo y capas georreferenciadas"),
    CONSULTAR_HISTORIAL("Consultar historial", "Consultar la ficha histórica y bitácora de intervenciones por lugar"),
    CONSULTAR_TAREAS_PROPIAS("Consultar tareas propias", "Consultar las órdenes de trabajo asignadas a la cuadrilla propia");

    private final String nombreVisible;
    private final String descripcion;

    Permiso(String nombreVisible, String descripcion) {
        this.nombreVisible = nombreVisible;
        this.descripcion = descripcion;
    }

    public String getNombreVisible() {
        return nombreVisible;
    }

    public String getDescripcion() {
        return descripcion;
    }
}
