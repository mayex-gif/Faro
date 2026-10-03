package com.faro.backend.models;

import jakarta.persistence.*;

/**
 * Un estado posible de una Orden de Trabajo (ej: "Pendiente", "En curso", "Finalizada").
 * Es una TABLA y no un enum para que los estados se puedan configurar sin tocar el código.
 */
@Entity
@Table(name = "estados_orden")
public class EstadoOrden {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String nombre; // Ej: "En curso"

    @Column(nullable = false, length = 7)
    private String color; // Para la tabla y el mapa, formato "#RRGGBB"

    @Column(nullable = false)
    private boolean inicial; // true = las OT nuevas arrancan en este estado (debe haber uno solo)

    @Column(nullable = false)
    private boolean cierre; // true = estado final (Finalizada, Cancelada): la OT ya no cambia más

    @Column(nullable = false)
    private int posicion; // Orden en que se muestran los estados en pantalla

    // JPA necesita un constructor vacío para poder armar el objeto cuando lee de la base
    protected EstadoOrden() {
    }

    public EstadoOrden(String nombre, String color, boolean inicial, boolean cierre, int posicion) {
        this.nombre = nombre;
        this.color = color;
        this.inicial = inicial;
        this.cierre = cierre;
        this.posicion = posicion;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public boolean isInicial() { return inicial; }
    public void setInicial(boolean inicial) { this.inicial = inicial; }

    public boolean isCierre() { return cierre; }
    public void setCierre(boolean cierre) { this.cierre = cierre; }

    public int getPosicion() { return posicion; }
    public void setPosicion(int posicion) { this.posicion = posicion; }
}