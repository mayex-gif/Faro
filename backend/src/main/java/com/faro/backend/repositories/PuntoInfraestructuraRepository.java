package com.faro.backend.repositories;

import com.faro.backend.models.PuntoInfraestructura;
import org.locationtech.jts.geom.Geometry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PuntoInfraestructuraRepository extends JpaRepository<PuntoInfraestructura, Long> {

    // 1. Búsquedas exactas generadas automáticamente por Spring Data
    // Útil para buscar todas las luminarias o todos los espacios verdes
    List<PuntoInfraestructura> findByTipo(String tipo);

    // Útil para filtrar en el mapa solo la infraestructura que requiere atención
    List<PuntoInfraestructura> findByTipoAndEstadoOperativo(String tipo, Boolean estadoOperativo);

    // 2. CONSULTAS ESPACIALES CON POSTGIS (JTS)
    // Esta consulta es vital para el mapa: devuelve solo los lugares que caen dentro
    // de un polígono o área específica (el recuadro visible del mapa en React).
    @Query("SELECT p FROM PuntoInfraestructura p WHERE st_within(p.ubicacion, :area) = true")
    List<PuntoInfraestructura> findInfraestructuraEnArea(@Param("area") Geometry area);

    // Si más adelante necesitan buscar "lugares a menos de X metros de un punto"
    // (por ejemplo, para saber qué cuadrilla está más cerca)
    @Query("SELECT p FROM PuntoInfraestructura p WHERE st_distance(p.ubicacion, :punto) < :distancia")
    List<PuntoInfraestructura> findInfraestructuraCercana(@Param("punto") Geometry punto, @Param("distancia") double distancia);
}