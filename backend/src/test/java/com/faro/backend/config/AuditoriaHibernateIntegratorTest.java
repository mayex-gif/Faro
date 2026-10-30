package com.faro.backend.config;

import org.hibernate.boot.Metadata;
import org.hibernate.boot.spi.BootstrapContext;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.event.service.spi.EventListenerRegistry;
import org.hibernate.event.spi.EventType;
import org.hibernate.integrator.spi.Integrator;
import org.hibernate.jpa.boot.spi.IntegratorProvider;
import org.hibernate.service.spi.SessionFactoryServiceRegistry;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.*;

class AuditoriaHibernateIntegratorTest {

    private final AuditoriaHibernateEventListener listener = mock(AuditoriaHibernateEventListener.class);
    private final AuditoriaHibernateIntegrator integrator = new AuditoriaHibernateIntegrator(listener);

    @Test
    void registraLosTresEventosDePersistencia() {
        SessionFactoryImplementor factory = mock(SessionFactoryImplementor.class);
        SessionFactoryServiceRegistry serviceRegistry = mock(SessionFactoryServiceRegistry.class);
        EventListenerRegistry eventRegistry = mock(EventListenerRegistry.class);
        when(factory.getServiceRegistry()).thenReturn(serviceRegistry);
        when(serviceRegistry.getService(EventListenerRegistry.class)).thenReturn(eventRegistry);

        integrator.integrate(mock(Metadata.class), mock(BootstrapContext.class), factory);

        verify(eventRegistry).appendListeners(EventType.POST_INSERT, listener);
        verify(eventRegistry).appendListeners(EventType.POST_UPDATE, listener);
        verify(eventRegistry).appendListeners(EventType.POST_DELETE, listener);
    }

    @Test
    void publicaElIntegradorEnLasPropiedadesDeHibernate() {
        var customizer = new AuditoriaHibernateConfig().configurarIntegradorAuditoria(integrator);
        var properties = new HashMap<String, Object>();

        customizer.customize(properties);

        IntegratorProvider provider = (IntegratorProvider) properties.get("hibernate.integrator_provider");
        List<Integrator> integrators = provider.getIntegrators();
        assertSame(integrator, integrators.get(0));
    }

    @Test
    void desinstalacionNoRequiereAccionesAdicionales() {
        integrator.disintegrate(mock(SessionFactoryImplementor.class),
                mock(SessionFactoryServiceRegistry.class));
    }
}
