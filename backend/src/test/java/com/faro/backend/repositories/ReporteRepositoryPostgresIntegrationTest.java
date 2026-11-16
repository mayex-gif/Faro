package com.faro.backend.repositories;

import com.faro.backend.models.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ejecuta las JPQL y consultas nativas contra PostgreSQL real.
 * Requiere FARO_POSTGRES_INTEGRATION_URL apuntando a una base de datos desechable,
 * ya que Hibernate crea y elimina su esquema durante esta prueba.
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "FARO_POSTGRES_INTEGRATION_URL", matches = "jdbc:postgresql:.*")
class ReporteRepositoryPostgresIntegrationTest {

    @Autowired private ReporteRepository repository;
    @Autowired private EntityManager entityManager;

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("FARO_POSTGRES_INTEGRATION_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_USERNAME", "faro"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_PASSWORD", "faro"));
    }

    @Test
    void ejecutaAgrupacionesYSeriesTemporalesEnPostgres() {
        LocalDateTime desde = LocalDate.of(2026, 10, 1).atStartOfDay();
        LocalDateTime hasta = LocalDate.of(2026, 10, 31).atTime(23, 59, 59);

        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setNombre("Plaza de prueba");
        lugar.setTipo("ESPACIO_VERDE");
        GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        Point ubicacion = geometryFactory.createPoint(new Coordinate(-58.0, -34.0));
        ubicacion.setSRID(4326);
        lugar.setUbicacion(ubicacion);
        entityManager.persist(lugar);

        EstadoOrden pendiente = new EstadoOrden("Pendiente integración", "#566A73", true, false, 1);
        EstadoOrden finalizada = new EstadoOrden("Finalizada integración", "#27AE60", false, true, 2);
        entityManager.persist(pendiente);
        entityManager.persist(finalizada);

        entityManager.persist(orden(lugar, pendiente, TipoTrabajo.PODA, desde.plusDays(2), null));
        entityManager.persist(orden(lugar, finalizada, TipoTrabajo.PODA, desde.plusDays(3), desde.plusDays(4)));
        entityManager.persist(orden(lugar, finalizada, TipoTrabajo.BACHEO, desde.plusDays(5), desde.plusDays(8)));
        entityManager.flush();

        assertThat(repository.contarTotalOts(desde, hasta)).isEqualTo(3);
        assertThat(repository.contarOtsCerradas(desde, hasta)).isEqualTo(2);
        assertThat(repository.contarOtsPorEstado(desde, hasta)).hasSize(2);
        assertThat(repository.contarOtsPorTipoTrabajo(desde, hasta)).hasSize(2);
        assertThat(repository.contarOtsPorCuadrilla(desde, hasta)).anySatisfy(fila ->
                assertThat(((Number) fila[2]).longValue()).isEqualTo(3));
        assertThat(repository.serieOtsCreadasPorDia(desde, hasta)).hasSize(3);
        assertThat(repository.serieOtsCreadasPorSemana(desde, hasta)).hasSize(1);
        assertThat(repository.serieOtsCreadasPorMes(desde, hasta)).hasSize(1);
        assertThat(repository.serieOtsCerradasPorDia(desde, hasta)).hasSize(2);
        assertThat(repository.serieOtsCerradasPorSemana(desde, hasta)).hasSize(1);
        assertThat(repository.serieOtsCerradasPorMes(desde, hasta)).hasSize(1);
        assertThat(repository.buscarOtsParaCsv(desde, hasta)).hasSize(2);
        assertThat(repository.buscarOtsConPlanificacion(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31))).isEmpty();
    }

    private OrdenTrabajo orden(PuntoInfraestructura lugar, EstadoOrden estado, TipoTrabajo tipo,
                               LocalDateTime creada, LocalDateTime finalizada) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setDescripcion("Trabajo de integración");
        orden.setTipo(tipo);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(lugar);
        orden.setEstado(estado);
        orden.setFechaCreacion(creada);
        orden.setFechaFinalizacion(finalizada);
        return orden;
    }
}
