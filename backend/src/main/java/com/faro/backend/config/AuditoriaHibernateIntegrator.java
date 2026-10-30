package com.faro.backend.config;

import org.hibernate.boot.Metadata;
import org.hibernate.boot.spi.BootstrapContext;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.event.service.spi.EventListenerRegistry;
import org.hibernate.event.spi.EventType;
import org.hibernate.integrator.spi.Integrator;
import org.hibernate.service.spi.SessionFactoryServiceRegistry;
import org.springframework.stereotype.Component;

/** Instala los escuchas de auditoría en el ciclo de persistencia de Hibernate. */
@Component
public class AuditoriaHibernateIntegrator implements Integrator {

    private final AuditoriaHibernateEventListener listener;

    public AuditoriaHibernateIntegrator(AuditoriaHibernateEventListener listener) {
        this.listener = listener;
    }

    @Override
    public void integrate(Metadata metadata, BootstrapContext bootstrapContext,
                          SessionFactoryImplementor sessionFactory) {
        EventListenerRegistry registry = sessionFactory.getServiceRegistry()
                .getService(EventListenerRegistry.class);
        registry.appendListeners(EventType.POST_INSERT, listener);
        registry.appendListeners(EventType.POST_UPDATE, listener);
        registry.appendListeners(EventType.POST_DELETE, listener);
    }

    @Override
    public void disintegrate(SessionFactoryImplementor sessionFactory,
                             SessionFactoryServiceRegistry serviceRegistry) {
        // Hibernate descarta los listeners junto con la SessionFactory.
    }
}
