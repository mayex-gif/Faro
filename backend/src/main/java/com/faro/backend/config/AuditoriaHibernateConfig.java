package com.faro.backend.config;

import org.hibernate.jpa.boot.spi.IntegratorProvider;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/** Enlaza el integrador de auditoría al arranque de Hibernate. */
@Configuration
public class AuditoriaHibernateConfig {

    @Bean
    HibernatePropertiesCustomizer configurarIntegradorAuditoria(AuditoriaHibernateIntegrator integrator) {
        return propiedades -> propiedades.put("hibernate.integrator_provider",
                (IntegratorProvider) () -> List.of(integrator));
    }
}
