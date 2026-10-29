package com.faro.backend.config;

import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.EventoOrden;
import com.faro.backend.models.OperacionSincronizada;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.models.TransicionEstado;
import com.faro.backend.models.Usuario;
import com.faro.backend.services.AuditoriaActorProvider;
import com.faro.backend.services.AuditoriaSnapshotSerializer;
import com.faro.backend.services.RegistroAuditoriaWriter;
import org.hibernate.event.spi.PostDeleteEvent;
import org.hibernate.event.spi.PostDeleteEventListener;
import org.hibernate.event.spi.PostInsertEvent;
import org.hibernate.event.spi.PostInsertEventListener;
import org.hibernate.event.spi.PostUpdateEvent;
import org.hibernate.event.spi.PostUpdateEventListener;
import org.hibernate.persister.entity.EntityPersister;
import org.springframework.stereotype.Component;

import java.util.Set;

/** Captura automáticamente los cambios de entidades clave al persistirse en Hibernate. */
@Component
public class AuditoriaHibernateEventListener implements PostInsertEventListener,
        PostUpdateEventListener, PostDeleteEventListener {

    private static final Set<Class<?>> ENTIDADES_AUDITADAS = Set.of(
            Usuario.class,
            OrdenTrabajo.class,
            PuntoInfraestructura.class,
            Cuadrilla.class,
            EstadoOrden.class,
            TransicionEstado.class,
            EventoOrden.class,
            OperacionSincronizada.class
    );

    private final RegistroAuditoriaWriter writer;
    private final AuditoriaActorProvider actorProvider;
    private final AuditoriaSnapshotSerializer serializer;

    public AuditoriaHibernateEventListener(RegistroAuditoriaWriter writer,
                                          AuditoriaActorProvider actorProvider,
                                          AuditoriaSnapshotSerializer serializer) {
        this.writer = writer;
        this.actorProvider = actorProvider;
        this.serializer = serializer;
    }

    @Override
    public void onPostInsert(PostInsertEvent event) {
        registrar(event.getPersister(), event.getId(), AccionAuditoria.CREACION,
                null, event.getState());
    }

    @Override
    public void onPostUpdate(PostUpdateEvent event) {
        registrar(event.getPersister(), event.getId(), AccionAuditoria.MODIFICACION,
                event.getOldState(), event.getState());
    }

    @Override
    public void onPostDelete(PostDeleteEvent event) {
        registrar(event.getPersister(), event.getId(), AccionAuditoria.ELIMINACION,
                event.getDeletedState(), null);
    }

    private void registrar(EntityPersister persister, Object id, AccionAuditoria accion,
                           Object[] valoresAnteriores, Object[] valoresNuevos) {
        Class<?> entidad = persister.getMappedClass();
        if (!ENTIDADES_AUDITADAS.contains(entidad)) {
            return;
        }
        String[] propiedades = persister.getPropertyNames();
        writer.registrar(accion, entidad.getSimpleName(), id, actorProvider.actorActual(),
                serializer.serializar(propiedades, valoresAnteriores),
                serializer.serializar(propiedades, valoresNuevos));
    }
}
