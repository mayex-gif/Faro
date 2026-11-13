package com.faro.backend.repositories;

import com.faro.backend.models.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba las sumas de "declarado" y "gastado en total" de los reportes contra PostgreSQL real.
 * Regla: si una OT finalizada no tiene gasto real, cuenta lo declarado; las canceladas y las abiertas no cuentan.
 * Requiere FARO_POSTGRES_INTEGRATION_URL apuntando a una base de datos desechable,
 * ya que Hibernate crea y elimina su esquema durante esta prueba.
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "FARO_POSTGRES_INTEGRATION_URL", matches = "jdbc:postgresql:.*")
class ReporteRepositoryGastoPostgresIntegrationTest {

    @Autowired private ReporteRepository repository;
    @Autowired private EntityManager entityManager;

    private PuntoInfraestructura lugar;
    private EstadoOrden enCurso;
    private EstadoOrden finalizada;
    private EstadoOrden cancelada;

    private static final LocalDateTime DESDE = LocalDateTime.of(2026, 10, 1, 0, 0);
    private static final LocalDateTime HASTA = LocalDateTime.of(2026, 11, 30, 23, 59);

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("FARO_POSTGRES_INTEGRATION_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_USERNAME", "faro"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_PASSWORD", "faro"));
    }

    @BeforeEach
    void cargarDatos() {
        lugar = new PuntoInfraestructura();
        lugar.setNombre("Plaza de prueba gasto");
        lugar.setTipo("ESPACIO_VERDE");
        Point ubicacion = new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-64.14, -31.13));
        ubicacion.setSRID(4326);
        lugar.setUbicacion(ubicacion);
        entityManager.persist(lugar);

        enCurso = new EstadoOrden("En curso", "#9A4A12", false, false, 3);
        finalizada = new EstadoOrden("Finalizada", "#22633E", false, true, 4);
        cancelada = new EstadoOrden("Cancelada", "#A52A27", false, true, 5);
        entityManager.persist(enCurso);
        entityManager.persist(finalizada);
        entityManager.persist(cancelada);

        // Octubre: declarado 20.000, se gastaron 15.000 (se gastó menos)
        orden(finalizada, "20000", "15000", LocalDateTime.of(2026, 10, 5, 10, 0));
        // Octubre: declarado 5.000, no se informó el gasto → cuenta lo declarado (5.000)
        orden(finalizada, "5000", null, LocalDateTime.of(2026, 10, 20, 10, 0));
        // Noviembre: sin declarar, se gastaron 3.000
        orden(finalizada, null, "3000", LocalDateTime.of(2026, 11, 2, 10, 0));
        // No cuentan: una cancelada y una abierta
        orden(cancelada, "9999", "9999", LocalDateTime.of(2026, 11, 3, 10, 0));
        orden(enCurso, "7777", null, null);
        entityManager.flush();
    }

    private void orden(EstadoOrden estado, String declarado, String gastado, LocalDateTime finalizacion) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setDescripcion("OT de prueba gasto");
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(lugar);
        orden.setEstado(estado);
        orden.setMontoAproximado(declarado == null ? null : new BigDecimal(declarado));
        orden.setGastoReal(gastado == null ? null : new BigDecimal(gastado));
        orden.setFechaFinalizacion(finalizacion);
        entityManager.persist(orden);
    }

    @Test
    void sumaLoDeclaradoYLoGastadoDeLasFinalizadas() {
        assertThat(repository.sumarMontosAproximados(DESDE, HASTA)).isEqualByComparingTo("25000"); // 20.000 + 5.000
        assertThat(repository.sumarGastosReales(DESDE, HASTA)).isEqualByComparingTo("23000");      // 15.000 + 5.000 + 3.000
    }

    @Test
    void laSeriePorMesTraeLoDeclaradoYLoGastadoDeCadaMes() {
        List<Object[]> filas = repository.sumarMontosPorMes(DESDE, HASTA);

        assertThat(filas).hasSize(2);
        assertThat(filas.get(0)[0]).isEqualTo("2026-10");
        assertThat(new BigDecimal(filas.get(0)[1].toString())).isEqualByComparingTo("25000");
        assertThat(new BigDecimal(filas.get(0)[2].toString())).isEqualByComparingTo("20000");
        assertThat(filas.get(1)[0]).isEqualTo("2026-11");
        assertThat(new BigDecimal(filas.get(1)[1].toString())).isEqualByComparingTo("0");
        assertThat(new BigDecimal(filas.get(1)[2].toString())).isEqualByComparingTo("3000");
    }

    @Test
    void lasSeriesPorDiaYSemanaUsanLaMismaRegla() {
        BigDecimal gastadoPorDia = repository.sumarMontosPorDia(DESDE, HASTA).stream()
                .map(fila -> new BigDecimal(fila[2].toString())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal gastadoPorSemana = repository.sumarMontosPorSemana(DESDE, HASTA).stream()
                .map(fila -> new BigDecimal(fila[2].toString())).reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(gastadoPorDia).isEqualByComparingTo("23000");
        assertThat(gastadoPorSemana).isEqualByComparingTo("23000");
    }
}
