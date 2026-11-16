package com.faro.backend.repositories;

import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.models.RegistroAuditoria;
import com.faro.backend.services.AuditoriaConsultaService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La búsqueda de la Auditoría contra PostgreSQL real: con filtros vacíos daba
 * "function lower(bytea) does not exist" (500). Requiere FARO_POSTGRES_INTEGRATION_URL
 * apuntando a una base desechable (Hibernate crea y borra el esquema).
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "FARO_POSTGRES_INTEGRATION_URL", matches = "jdbc:postgresql:.*")
class RegistroAuditoriaRepositoryPostgresIntegrationTest {

    @Autowired private RegistroAuditoriaRepository repository;
    @Autowired private EntityManager entityManager;

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("FARO_POSTGRES_INTEGRATION_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_USERNAME", "faro"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("FARO_POSTGRES_INTEGRATION_PASSWORD", "faro"));
    }

    @BeforeEach
    void cargar() {
        entityManager.createNativeQuery("""
                INSERT INTO registros_auditoria (accion, tipo_registro, registro_id, actor, fecha)
                VALUES ('CREACION', 'OrdenTrabajo', '7', 'encargado@generalpaz.gob.ar', '2026-11-08 10:00'),
                       ('ELIMINACION', 'ComentarioOrden', '4', 'Capataz.Verde@generalpaz.gob.ar', '2026-11-09 11:00')
                """).executeUpdate();
    }

    @Test
    void sinFiltros_traeTodo() {
        assertThat(repository.findAll(AuditoriaConsultaService.filtros(null, null, null, null, null, null),
                Pageable.unpaged())).hasSize(2);
    }

    @Test
    void conCadaFiltro_traeSoloLoQueCoincide() {
        assertThat(buscar(AuditoriaConsultaService.filtros(AccionAuditoria.ELIMINACION, null, null, null, null, null)))
                .extracting(RegistroAuditoria::getRegistroId).containsExactly("4");
        assertThat(buscar(AuditoriaConsultaService.filtros(null, "OrdenTrabajo", "7", null, null, null)))
                .extracting(RegistroAuditoria::getRegistroId).containsExactly("7");
        assertThat(buscar(AuditoriaConsultaService.filtros(null, null, null, "capataz.verde", null, null)))
                .extracting(RegistroAuditoria::getRegistroId).containsExactly("4");
        assertThat(buscar(AuditoriaConsultaService.filtros(null, null, null, null,
                LocalDateTime.of(2026, 11, 9, 0, 0), LocalDateTime.of(2026, 11, 9, 23, 59))))
                .extracting(RegistroAuditoria::getRegistroId).containsExactly("4");
    }

    private java.util.List<RegistroAuditoria> buscar(org.springframework.data.jpa.domain.Specification<RegistroAuditoria> filtros) {
        return repository.findAll(filtros, Pageable.unpaged()).getContent();
    }
}
