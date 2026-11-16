package com.faro.backend.config;

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
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba el InicializadorGastoReal contra PostgreSQL real, como si fuera la base de Neon de Render:
 * OT finalizadas con el pop-up de #74 (gasto_adicional) que tienen que pasar al gasto total (gasto_real).
 * Requiere FARO_POSTGRES_INTEGRATION_URL apuntando a una base de datos desechable,
 * ya que Hibernate crea y elimina su esquema durante esta prueba.
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "FARO_POSTGRES_INTEGRATION_URL", matches = "jdbc:postgresql:.*")
@Import(InicializadorGastoReal.class)
class InicializadorGastoRealPostgresIntegrationTest {

    @Autowired private InicializadorGastoReal inicializador;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private PuntoInfraestructura lugar;
    private EstadoOrden enCurso;
    private EstadoOrden finalizada;

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("FARO_POSTGRES_INTEGRATION_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_USERNAME", "faro"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_PASSWORD", "faro"));
    }

    @BeforeEach
    void prepararLaBaseComoEnRender() {
        // En Neon la columna vieja existe (la creó #74); en una base nueva no: la agregamos para simularla
        jdbc.execute("ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS gasto_adicional NUMERIC(14,2)");
        jdbc.execute("ALTER TABLE eventos_orden ADD COLUMN IF NOT EXISTS gasto_adicional NUMERIC(14,2)");

        lugar = new PuntoInfraestructura();
        lugar.setNombre("Calle de prueba gasto");
        lugar.setTipo("ESPACIO_VERDE");
        Point ubicacion = new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-64.14, -31.13));
        ubicacion.setSRID(4326);
        lugar.setUbicacion(ubicacion);
        entityManager.persist(lugar);

        enCurso = new EstadoOrden("En curso gasto", "#9A4A12", false, false, 3);
        finalizada = new EstadoOrden("Finalizada gasto", "#22633E", false, true, 4);
        entityManager.persist(enCurso);
        entityManager.persist(finalizada);
        entityManager.flush();
    }

    /** Una OT finalizada con el pop-up de #74: lo declarado y lo que se gastó de más (en la OT y en la bitácora). */
    private OrdenTrabajo finalizadaConElPopUpViejo(String declarado, String adicional) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setDescripcion("Bachear");
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(lugar);
        orden.setEstado(finalizada);
        orden.setMontoAproximado(declarado == null ? null : new BigDecimal(declarado));
        entityManager.persist(orden);
        entityManager.persist(EventoOrden.finalizacion(orden, enCurso, finalizada, null, null));
        entityManager.flush();
        BigDecimal gasto = adicional == null ? null : new BigDecimal(adicional);
        jdbc.update("UPDATE ordenes_trabajo SET gasto_adicional = ? WHERE id = ?", gasto, orden.getId());
        jdbc.update("UPDATE eventos_orden SET gasto_adicional = ? WHERE orden_id = ?", gasto, orden.getId());
        return orden;
    }

    private BigDecimal gastoRealDeLaOt(OrdenTrabajo orden) {
        return jdbc.queryForObject("SELECT gasto_real FROM ordenes_trabajo WHERE id = ?", BigDecimal.class, orden.getId());
    }

    private BigDecimal gastoRealDeLaBitacora(OrdenTrabajo orden) {
        return jdbc.queryForObject("SELECT gasto_real FROM eventos_orden WHERE orden_id = ?", BigDecimal.class, orden.getId());
    }

    @Test
    void pasaElGastoAdicionalAlGastoTotalEnLaOtYEnLaBitacora() {
        OrdenTrabajo conMonto = finalizadaConElPopUpViejo("20000", "3000");
        OrdenTrabajo sinMonto = finalizadaConElPopUpViejo(null, "8000.50");
        OrdenTrabajo sinGasto = finalizadaConElPopUpViejo("5000", null);

        inicializador.run();

        assertThat(gastoRealDeLaOt(conMonto)).isEqualByComparingTo("23000");     // 20.000 + 3.000
        assertThat(gastoRealDeLaBitacora(conMonto)).isEqualByComparingTo("23000");
        assertThat(gastoRealDeLaOt(sinMonto)).isEqualByComparingTo("8000.50");   // 0 + 8.000,50
        assertThat(gastoRealDeLaBitacora(sinMonto)).isEqualByComparingTo("8000.50");
        assertThat(gastoRealDeLaOt(sinGasto)).isNull();                           // no se informó: queda sin dato
        assertThat(gastoRealDeLaBitacora(sinGasto)).isNull();
    }

    @Test
    void laSegundaVezNoVuelveASumar() {
        OrdenTrabajo orden = finalizadaConElPopUpViejo("20000", "3000");

        inicializador.run();
        inicializador.run(); // el backend arrancó de nuevo (ej: otro deploy en Render)

        assertThat(gastoRealDeLaOt(orden)).isEqualByComparingTo("23000");
        assertThat(gastoRealDeLaBitacora(orden)).isEqualByComparingTo("23000");
    }

    @Test
    void noPisaUnGastoTotalQueYaTenia() {
        OrdenTrabajo orden = finalizadaConElPopUpViejo("20000", "3000");
        jdbc.update("UPDATE ordenes_trabajo SET gasto_real = 15000 WHERE id = ?", orden.getId());

        inicializador.run();

        assertThat(gastoRealDeLaOt(orden)).isEqualByComparingTo("15000");
    }
}
