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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Prueba las tablas de comentarios y fotos contra PostgreSQL real (como ReporteRepositoryPostgresIntegrationTest).
 * Requiere FARO_POSTGRES_INTEGRATION_URL apuntando a una base de datos desechable,
 * ya que Hibernate crea y elimina su esquema durante esta prueba.
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "FARO_POSTGRES_INTEGRATION_URL", matches = "jdbc:postgresql:.*")
class ComentarioOrdenRepositoryPostgresIntegrationTest {

    @Autowired private ComentarioOrdenRepository comentarios;
    @Autowired private FotoComentarioRepository fotos;
    @Autowired private EntityManager entityManager;

    private OrdenTrabajo orden;
    private OrdenTrabajo otraOrden;
    private Usuario autor;

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("FARO_POSTGRES_INTEGRATION_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_USERNAME", "faro"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_PASSWORD", "faro"));
    }

    @BeforeEach
    void cargarDatos() {
        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setNombre("Plaza de prueba");
        lugar.setTipo("ESPACIO_VERDE");
        Point ubicacion = new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-64.14, -31.13));
        ubicacion.setSRID(4326);
        lugar.setUbicacion(ubicacion);
        entityManager.persist(lugar);

        EstadoOrden pendiente = new EstadoOrden("Pendiente comentarios", "#566A73", true, false, 1);
        entityManager.persist(pendiente);

        Cuadrilla verde = new Cuadrilla();
        verde.setNombre("Cuadrilla de prueba comentarios");
        entityManager.persist(verde);

        orden = orden(lugar, pendiente, verde);
        otraOrden = orden(lugar, pendiente, null);

        autor = new Usuario("Carlos", "Rodríguez", "capataz.prueba@faro.gob.ar", "hash", RolUsuario.CAPATAZ_CUADRILLA,
                verde.getId(), true);
        entityManager.persist(autor);
        entityManager.flush();
    }

    @Test
    void guardaElComentarioConSusFotosYLosDevuelveDelMasNuevoAlMasViejo() {
        ComentarioOrden viejo = ComentarioOrden.nuevo(UUID.randomUUID(), orden, autor, "Primero", hora("10:00"));
        ComentarioOrden nuevo = ComentarioOrden.nuevo(UUID.randomUUID(), orden, autor, null, hora("11:30"));
        nuevo.agregarFoto("image/jpeg", 250_000);
        nuevo.agregarFoto("image/webp", 120_000);
        comentarios.save(viejo);
        comentarios.save(nuevo);
        comentarios.save(ComentarioOrden.nuevo(UUID.randomUUID(), otraOrden, autor, "De otra OT", hora("12:00")));
        entityManager.flush();
        entityManager.clear(); // para leer de la base y no de la memoria

        List<ComentarioOrden> muro = comentarios.findByOrdenIdOrderByHechoEnDescIdDesc(orden.getId());

        assertThat(muro).extracting(ComentarioOrden::getTexto).containsExactly(null, "Primero");
        ComentarioOrden leido = muro.get(0);
        assertThat(leido.getRecibidoEn()).isNotNull();
        assertThat(leido.getAutor().getNombre()).isEqualTo("Carlos");
        assertThat(leido.getFotos()).extracting(FotoComentario::getPosicion).containsExactly(0, 1);
        assertThat(leido.getFotos()).extracting(FotoComentario::getTipoContenido).containsExactly("image/jpeg", "image/webp");
    }

    @Test
    void encuentraUnComentarioPorSuNumeroDeComanda() {
        UUID comanda = UUID.randomUUID();
        ComentarioOrden comentario = ComentarioOrden.nuevo(comanda, orden, autor, "Hola", hora("09:00"));
        comentario.agregarFoto("image/png", 10);
        comentarios.save(comentario);
        entityManager.flush();
        entityManager.clear();

        assertThat(comentarios.findByOperacionId(comanda))
                .hasValueSatisfying(encontrado -> assertThat(encontrado.getFotos()).hasSize(1));
        assertThat(comentarios.findByOperacionId(UUID.randomUUID())).isEmpty();
    }

    @Test
    void laMismaComandaNoSePuedeGuardarDosVeces() {
        UUID comanda = UUID.randomUUID();
        comentarios.saveAndFlush(ComentarioOrden.nuevo(comanda, orden, autor, "Una vez", hora("09:00")));

        assertThatThrownBy(() -> comentarios.saveAndFlush(ComentarioOrden.nuevo(comanda, orden, autor, "Otra vez", hora("09:01"))))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void unaFotoSeBuscaConSuOrdenYSuCuadrilla() {
        ComentarioOrden comentario = ComentarioOrden.nuevo(UUID.randomUUID(), orden, autor, null, hora("09:00"));
        FotoComentario foto = comentario.agregarFoto("image/jpeg", 10);
        comentarios.save(comentario);
        entityManager.flush();
        entityManager.clear();

        FotoComentario leida = fotos.findConOrdenById(foto.getId()).orElseThrow();
        entityManager.clear(); // si no vino todo en la misma consulta, lo de abajo fallaría (LazyInitializationException)

        assertThat(leida.getComentario().getOrden().getId()).isEqualTo(orden.getId());
        assertThat(leida.getComentario().getOrden().getCuadrilla().getNombre()).isEqualTo("Cuadrilla de prueba comentarios");
    }

    @Test
    void borrarElComentarioBorraSusFotos() {
        ComentarioOrden comentario = ComentarioOrden.nuevo(UUID.randomUUID(), orden, autor, "Con fotos", hora("09:00"));
        comentario.agregarFoto("image/jpeg", 10);
        comentario.agregarFoto("image/jpeg", 20);
        comentarios.saveAndFlush(comentario);
        assertThat(fotos.count()).isEqualTo(2);

        comentarios.delete(comentario);
        entityManager.flush();

        assertThat(fotos.count()).isZero();
    }

    private OrdenTrabajo orden(PuntoInfraestructura lugar, EstadoOrden estado, Cuadrilla cuadrilla) {
        OrdenTrabajo nueva = new OrdenTrabajo();
        nueva.setDescripcion("Trabajo con comentarios");
        nueva.setTipo(TipoTrabajo.PODA);
        nueva.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        nueva.setPrioridad(PrioridadOrden.MEDIA);
        nueva.setLugar(lugar);
        nueva.setEstado(estado);
        nueva.setCuadrilla(cuadrilla);
        entityManager.persist(nueva);
        return nueva;
    }

    private static OffsetDateTime hora(String horaMinutos) {
        return OffsetDateTime.parse("2026-11-08T" + horaMinutos + ":00-03:00");
    }
}
