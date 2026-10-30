package com.faro.backend.repositories;

import com.faro.backend.models.OrdenTrabajo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Consultas JPQL agrupadas para el Panel de Reportes e Indicadores.
 * Todas las consultas reciben un rango de fechas (desde/hasta) como filtro base.
 */
@Repository
public interface ReporteRepository extends JpaRepository<OrdenTrabajo, Long> {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. KPIs generales
    // ─────────────────────────────────────────────────────────────────────────

    /** Total de OTs creadas en el período. */
    @Query("""
        SELECT COUNT(o)
        FROM OrdenTrabajo o
        WHERE o.fechaCreacion BETWEEN :desde AND :hasta
    """)
    long contarTotalOts(@Param("desde") LocalDateTime desde,
                        @Param("hasta") LocalDateTime hasta);

    /** OTs en estados de cierre (finalizadas, canceladas) creadas en el período. */
    @Query("""
        SELECT COUNT(o)
        FROM OrdenTrabajo o
        JOIN o.estado e
        WHERE o.fechaCreacion BETWEEN :desde AND :hasta
          AND e.cierre = true
    """)
    long contarOtsCerradas(@Param("desde") LocalDateTime desde,
                           @Param("hasta") LocalDateTime hasta);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Agrupaciones para gráficos
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * OTs agrupadas por estado, con nombre y color del estado.
     * Retorna Object[] con: [estadoNombre (String), estadoColor (String), cantidad (Long)]
     */
    @Query("""
        SELECT e.nombre, e.color, COUNT(o)
        FROM OrdenTrabajo o
        JOIN o.estado e
        WHERE o.fechaCreacion BETWEEN :desde AND :hasta
        GROUP BY e.nombre, e.color
        ORDER BY COUNT(o) DESC
    """)
    List<Object[]> contarOtsPorEstado(@Param("desde") LocalDateTime desde,
                                      @Param("hasta") LocalDateTime hasta);

    /**
     * OTs agrupadas por tipo de trabajo.
     * Retorna Object[] con: [tipoTrabajo (TipoTrabajo), cantidad (Long)]
     */
    @Query("""
        SELECT o.tipo, COUNT(o)
        FROM OrdenTrabajo o
        WHERE o.fechaCreacion BETWEEN :desde AND :hasta
        GROUP BY o.tipo
        ORDER BY COUNT(o) DESC
    """)
    List<Object[]> contarOtsPorTipoTrabajo(@Param("desde") LocalDateTime desde,
                                           @Param("hasta") LocalDateTime hasta);

    /**
     * OTs agrupadas por cuadrilla asignada. Incluye cuadrilla=null (sin asignar).
     * Retorna Object[] con: [cuadrillaId (Long o null), cuadrillaNombre (String o null), cantidad (Long)]
     */
    @Query("""
        SELECT c.id, c.nombre, COUNT(o)
        FROM OrdenTrabajo o
        LEFT JOIN o.cuadrilla c
        WHERE o.fechaCreacion BETWEEN :desde AND :hasta
        GROUP BY c.id, c.nombre
        ORDER BY COUNT(o) DESC
    """)
    List<Object[]> contarOtsPorCuadrilla(@Param("desde") LocalDateTime desde,
                                         @Param("hasta") LocalDateTime hasta);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Series temporales (consultas nativas — date_trunc de PostgreSQL)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Serie temporal de OTs CREADAS agrupadas por día.
     * Retorna Object[] con: [periodo (String "YYYY-MM-DD"), cantidad (Long)]
     */
    @Query(value = """
        SELECT TO_CHAR(DATE_TRUNC('day', fecha_creacion), 'YYYY-MM-DD') AS periodo,
               COUNT(*) AS cantidad
        FROM ordenes_trabajo
        WHERE fecha_creacion BETWEEN :desde AND :hasta
        GROUP BY periodo
        ORDER BY periodo
    """, nativeQuery = true)
    List<Object[]> serieOtsCreadasPorDia(@Param("desde") LocalDateTime desde,
                                         @Param("hasta") LocalDateTime hasta);

    /**
     * Serie temporal de OTs CREADAS agrupadas por semana ISO (ej: "2026-W43").
     * Retorna Object[] con: [periodo (String "YYYY-WNN"), cantidad (Long)]
     */
    @Query(value = """
        SELECT TO_CHAR(DATE_TRUNC('week', fecha_creacion), 'IYYY-"W"IW') AS periodo,
               COUNT(*) AS cantidad
        FROM ordenes_trabajo
        WHERE fecha_creacion BETWEEN :desde AND :hasta
        GROUP BY periodo
        ORDER BY periodo
    """, nativeQuery = true)
    List<Object[]> serieOtsCreadasPorSemana(@Param("desde") LocalDateTime desde,
                                            @Param("hasta") LocalDateTime hasta);

    /**
     * Serie temporal de OTs CREADAS agrupadas por mes (ej: "2026-10").
     * Retorna Object[] con: [periodo (String "YYYY-MM"), cantidad (Long)]
     */
    @Query(value = """
        SELECT TO_CHAR(DATE_TRUNC('month', fecha_creacion), 'YYYY-MM') AS periodo,
               COUNT(*) AS cantidad
        FROM ordenes_trabajo
        WHERE fecha_creacion BETWEEN :desde AND :hasta
        GROUP BY periodo
        ORDER BY periodo
    """, nativeQuery = true)
    List<Object[]> serieOtsCreadasPorMes(@Param("desde") LocalDateTime desde,
                                         @Param("hasta") LocalDateTime hasta);

    /**
     * Serie temporal de OTs CERRADAS agrupadas por día (fecha_finalizacion).
     * Retorna Object[] con: [periodo (String "YYYY-MM-DD"), cantidad (Long)]
     */
    @Query(value = """
        SELECT TO_CHAR(DATE_TRUNC('day', ot.fecha_finalizacion), 'YYYY-MM-DD') AS periodo,
               COUNT(*) AS cantidad
        FROM ordenes_trabajo ot
        JOIN estados_orden e ON ot.estado_id = e.id
        WHERE ot.fecha_finalizacion BETWEEN :desde AND :hasta
          AND e.cierre = true
        GROUP BY periodo
        ORDER BY periodo
    """, nativeQuery = true)
    List<Object[]> serieOtsCerradasPorDia(@Param("desde") LocalDateTime desde,
                                          @Param("hasta") LocalDateTime hasta);

    /**
     * Serie temporal de OTs CERRADAS agrupadas por semana ISO.
     * Retorna Object[] con: [periodo (String "YYYY-WNN"), cantidad (Long)]
     */
    @Query(value = """
        SELECT TO_CHAR(DATE_TRUNC('week', ot.fecha_finalizacion), 'IYYY-"W"IW') AS periodo,
               COUNT(*) AS cantidad
        FROM ordenes_trabajo ot
        JOIN estados_orden e ON ot.estado_id = e.id
        WHERE ot.fecha_finalizacion BETWEEN :desde AND :hasta
          AND e.cierre = true
        GROUP BY periodo
        ORDER BY periodo
    """, nativeQuery = true)
    List<Object[]> serieOtsCerradasPorSemana(@Param("desde") LocalDateTime desde,
                                             @Param("hasta") LocalDateTime hasta);

    /**
     * Serie temporal de OTs CERRADAS agrupadas por mes.
     * Retorna Object[] con: [periodo (String "YYYY-MM"), cantidad (Long)]
     */
    @Query(value = """
        SELECT TO_CHAR(DATE_TRUNC('month', ot.fecha_finalizacion), 'YYYY-MM') AS periodo,
               COUNT(*) AS cantidad
        FROM ordenes_trabajo ot
        JOIN estados_orden e ON ot.estado_id = e.id
        WHERE ot.fecha_finalizacion BETWEEN :desde AND :hasta
          AND e.cierre = true
        GROUP BY periodo
        ORDER BY periodo
    """, nativeQuery = true)
    List<Object[]> serieOtsCerradasPorMes(@Param("desde") LocalDateTime desde,
                                          @Param("hasta") LocalDateTime hasta);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. OTs con planificación (para cálculo de desvíos)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Todas las OTs del plan de mantenimiento cuya fechaPlanificada cae en el rango.
     * Con FETCH para evitar N+1 al acceder a estado, cuadrilla y lugar.
     */
    @Query("""
        SELECT DISTINCT o
        FROM OrdenTrabajo o
        LEFT JOIN FETCH o.estado
        LEFT JOIN FETCH o.cuadrilla
        LEFT JOIN FETCH o.lugar
        LEFT JOIN FETCH o.reglaMantenimiento
        WHERE o.origen = com.faro.backend.models.OrigenOrden.PLAN_MANTENIMIENTO
          AND o.fechaPlanificada BETWEEN :desde AND :hasta
        ORDER BY o.fechaPlanificada
    """)
    List<OrdenTrabajo> buscarOtsConPlanificacion(@Param("desde") LocalDate desde,
                                                 @Param("hasta") LocalDate hasta);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. OTs completas para exportación CSV
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Todas las OTs del período con sus relaciones cargadas (para el CSV de OTs resueltas).
     */
    @Query("""
        SELECT DISTINCT o
        FROM OrdenTrabajo o
        LEFT JOIN FETCH o.estado
        LEFT JOIN FETCH o.cuadrilla
        LEFT JOIN FETCH o.lugar
        WHERE o.fechaCreacion BETWEEN :desde AND :hasta
          AND o.fechaFinalizacion IS NOT NULL
        ORDER BY o.fechaCreacion DESC
    """)
    List<OrdenTrabajo> buscarOtsParaCsv(@Param("desde") LocalDateTime desde,
                                        @Param("hasta") LocalDateTime hasta);

    /**
     * OTs del plan de mantenimiento para el CSV de desvíos.
     */
    @Query("""
        SELECT DISTINCT o
        FROM OrdenTrabajo o
        LEFT JOIN FETCH o.estado
        LEFT JOIN FETCH o.cuadrilla
        LEFT JOIN FETCH o.lugar
        LEFT JOIN FETCH o.reglaMantenimiento
        WHERE o.origen = com.faro.backend.models.OrigenOrden.PLAN_MANTENIMIENTO
          AND o.fechaPlanificada BETWEEN :desde AND :hasta
        ORDER BY o.fechaPlanificada
    """)
    List<OrdenTrabajo> buscarDesviosParaCsv(@Param("desde") LocalDate desde,
                                            @Param("hasta") LocalDate hasta);
}
