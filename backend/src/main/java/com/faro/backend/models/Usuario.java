package com.faro.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Representa a un usuario operador del sistema FARO (encargado, capataz, mesa de entradas).
 */
@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String apellido;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RolUsuario rol;

    @Column(name = "cuadrilla_id")
    private Long cuadrillaId;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    public void prePersist() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
    }

    public Usuario() {
    }

    public Usuario(String nombre, String apellido, String email, String password, RolUsuario rol, Long cuadrillaId, boolean activo) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.password = password;
        this.rol = rol;
        this.cuadrillaId = cuadrillaId;
        this.activo = activo;
        this.fechaCreacion = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public RolUsuario getRol() {
        return rol;
    }

    public void setRol(RolUsuario rol) {
        this.rol = rol;
    }

    public Long getCuadrillaId() {
        return cuadrillaId;
    }

    public void setCuadrillaId(Long cuadrillaId) {
        this.cuadrillaId = cuadrillaId;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public boolean tienePermiso(Permiso permiso) {
        return rol != null && rol.tienePermiso(permiso);
    }
}
