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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba las consultas de la sección "Luminarias" de Reportes (nuevas vs viejas) contra PostgreSQL real
 * (usan COUNT ... FILTER, que es propio de PostgreSQL).
 * Requiere FARO_POSTGRES_INTEGRATION_URL apuntando a una base de datos desechable,
 * ya que Hibernate crea y elimina su esquema durante esta prueba.
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "FARO_POSTGRES_INTEGRATION_URL", matches = "jdbc:postgresql:.*")
class ReporteRepositoryLuminariasPostgresIntegrationTest {

    @Autowired private ReporteRepository repository;
    @Autowired private EntityManager entityManager;

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
        enCurso = new EstadoOrden("En curso", "#9A4A12", false, false, 3);
        finalizada = new EstadoOrden("Finalizada", "#22633E", false, true, 4);
        cancelada = new EstadoOrden("Cancelada", "#A52A27", false, true, 5);
        entityManager.persist(enCurso);
        entityManager.persist(finalizada);
        entityManager.persist(cancelada);

        // Nuevas: 2 funcionan, 1 en arreglo (apagada con una OT en curso)
        luminaria("Nueva 1", true, true, true);
        PuntoInfraestructura nueva2 = luminaria("Nueva 2", true, true, true);
        PuntoInfraestructura nuevaEnArreglo = luminaria("Nueva en arreglo", true, false, true);
        // Viejas: 1 funciona, 2 apagadas (una sin OT y otra con su OT ya finalizada: no está en arreglo)
        PuntoInfraestructura vieja = luminaria("Vieja 1", false, true, true);
        luminaria("Vieja apagada", false, false, true);
        PuntoInfraestructura viejaApagada = luminaria("Vieja apagada con OT cerrada", false, false, true);
        // Sin marcar: 1 que funciona (estado_operativo null cuenta como que funciona)
        luminaria("Sin marcar", null, null, true);
        // A futuro: no entra en ningún grupo
        luminaria("A futuro", null, false, false);
        // Una plaza "nueva" (no debería pasar, pero no es luminaria): no cuenta
        PuntoInfraestructura plaza = lugar("Plaza", "ESPACIO_VERDE", null, true, true);

        // OT del período
        orden(nuevaEnArreglo, enCurso, null, null, LocalDateTime.of(2026, 10, 3, 9, 0), null);
        orden(nueva2, finalizada, "8000", "6500", LocalDateTime.of(2026, 10, 4, 9, 0), LocalDateTime.of(2026, 10, 6, 9, 0));
        orden(vieja, finalizada, "10000", null, LocalDateTime.of(2026, 10, 10, 9, 0), LocalDateTime.of(2026, 10, 12, 9, 0));
        orden(viejaApagada, finalizada, "3000", "4000", LocalDateTime.of(2026, 11, 1, 9, 0), LocalDateTime.of(2026, 11, 2, 9, 0));
        orden(vieja, cancelada, "9999", "9999", LocalDateTime.of(2026, 11, 5, 9, 0), LocalDateTime.of(2026, 11, 6, 9, 0));
        // Fuera del período: ni cuenta como OT ni como gasto
        orden(vieja, finalizada, "50000", "50000", LocalDateTime.of(2026, 9, 1, 9, 0), LocalDateTime.of(2026, 9, 2, 9, 0));
        // OT de la plaza: no es luminaria
        orden(plaza, finalizada, "7000", "7000", LocalDateTime.of(2026, 10, 5, 9, 0), LocalDateTime.of(2026, 10, 6, 9, 0));
        entityManager.flush();
    }

    private PuntoInfraestructura luminaria(String nombre, Boolean nueva, Boolean funciona, boolean instalada) {
        return lugar("Luminaria " + nombre, "LUMINARIA", nueva, funciona, instalada);
    }

    private PuntoInfraestructura lugar(String nombre, String tipo, Boolean nueva, Boolean funciona, boolean instalada) {
        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setNombre(nombre);
        lugar.setTipo(tipo);
        lugar.setNueva(nueva);
        lugar.setEstadoOperativo(funciona);
        lugar.setInstalada(instalada);
        Point ubicacion = new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-64.14, -31.13));
        ubicacion.setSRID(4326);
        lugar.setUbicacion(ubicacion);
        entityManager.persist(lugar);
        return lugar;
    }

    private void orden(PuntoInfraestructura lugar, EstadoOrden estado, String declarado, String gastado,
                       LocalDateTime creacion, LocalDateTime finalizacion) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setDescripcion("OT de prueba luminarias");
        orden.setTipo(TipoTrabajo.ALUMBRADO);
        orden.setOrigen(OrigenOrden.RECLAMO_VECINAL);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(lugar);
        orden.setEstado(estado);
        orden.setMontoAproximado(declarado == null ? null : new BigDecimal(declarado));
        orden.setGastoReal(gastado == null ? null : new BigDecimal(gastado));
        orden.setFechaCreacion(creacion);
        orden.setFechaFinalizacion(finalizacion);
        entityManager.persist(orden);
    }

    /** Las filas por grupo, con clave "nueva" / "vieja" / "sinMarcar". */
    private static Map<String, Object[]> porGrupo(List<Object[]> filas) {
        Map<String, Object[]> mapa = new HashMap<>();
        for (Object[] fila : filas) {
            String clave = fila[0] == null ? "sinMarcar" : Boolean.TRUE.equals(fila[0]) ? "nueva" : "vieja";
            mapa.put(clave, fila);
        }
        return mapa;
    }

    private static long numero(Object[] fila, int columna) {
        return ((Number) fila[columna]).longValue();
    }

    @Test
    void cuentaComoEstanHoyLasDeCadaGrupo() {
        Map<String, Object[]> grupos = porGrupo(repository.contarLuminariasPorGrupo());

        // [nueva, cantidad, funcionan, apagadas, enArreglo]
        assertThat(grupos).containsOnlyKeys("nueva", "vieja", "sinMarcar"); // la plaza y la a futuro no aparecen
        Object[] nuevas = grupos.get("nueva");
        assertThat(new long[] {numero(nuevas, 1), numero(nuevas, 2), numero(nuevas, 3), numero(nuevas, 4)})
                .containsExactly(3, 2, 0, 1);
        Object[] viejas = grupos.get("vieja");
        assertThat(new long[] {numero(viejas, 1), numero(viejas, 2), numero(viejas, 3), numero(viejas, 4)})
                .containsExactly(3, 1, 2, 0);
        Object[] sinMarcar = grupos.get("sinMarcar");
        assertThat(new long[] {numero(sinMarcar, 1), numero(sinMarcar, 2)}).containsExactly(1, 1);
    }

    @Test
    void cuentaLasAFuturoAparte() {
        assertThat(repository.contarLuminariasAFuturo()).isEqualTo(1);
    }

    @Test
    void cuentaLasOtCreadasEnElPeriodoPorGrupo() {
        Map<String, Object[]> grupos = porGrupo(repository.contarOtsDeLuminariasPorGrupo(DESDE, HASTA));

        assertThat(numero(grupos.get("nueva"), 1)).isEqualTo(2); // la en curso y la finalizada
        assertThat(numero(grupos.get("vieja"), 1)).isEqualTo(3); // 2 finalizadas + 1 cancelada (la de septiembre no)
        assertThat(grupos).doesNotContainKey("sinMarcar");
    }

    @Test
    void sumaLoGastadoDeLasFinalizadasDelPeriodoPorGrupo() {
        Map<String, Object[]> grupos = porGrupo(repository.sumarGastosDeLuminariasPorGrupo(DESDE, HASTA));

        // nuevas: 6.500 (gasto real) · viejas: 10.000 (sin gasto real → lo declarado) + 4.000; la cancelada no cuenta
        assertThat(new BigDecimal(grupos.get("nueva")[1].toString())).isEqualByComparingTo("6500");
        assertThat(new BigDecimal(grupos.get("vieja")[1].toString())).isEqualByComparingTo("14000");
    }
}
