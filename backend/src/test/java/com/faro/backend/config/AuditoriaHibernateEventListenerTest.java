package com.faro.backend.config;

import com.faro.backend.models.AccionAuditoria;
import com.faro.backend.models.ComentarioOrden;
import com.faro.backend.models.EventoOrden;
import com.faro.backend.models.FotoComentario;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.Usuario;
import com.faro.backend.services.AuditoriaActorProvider;
import com.faro.backend.services.AuditoriaSnapshotSerializer;
import com.faro.backend.services.RegistroAuditoriaWriter;
import org.hibernate.event.spi.PostDeleteEvent;
import org.hibernate.event.spi.PostInsertEvent;
import org.hibernate.event.spi.PostUpdateEvent;
import org.hibernate.persister.entity.EntityPersister;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.*;

class AuditoriaHibernateEventListenerTest {

    private final RegistroAuditoriaWriter writer = mock(RegistroAuditoriaWriter.class);
    private final AuditoriaActorProvider actor = mock(AuditoriaActorProvider.class);
    private final AuditoriaSnapshotSerializer serializer = new AuditoriaSnapshotSerializer(
            tools.jackson.databind.json.JsonMapper.builder().build());
    private final AuditoriaHibernateEventListener listener =
            new AuditoriaHibernateEventListener(writer, actor, serializer);

    @Test
    void registraCreacionDeUsuarioSinCapturarClave() {
        EntityPersister persister = persister(Usuario.class, "email", "password");
        PostInsertEvent event = mock(PostInsertEvent.class);
        when(event.getPersister()).thenReturn(persister);
        when(event.getId()).thenReturn(5L);
        when(event.getState()).thenReturn(new Object[]{"ana@faro.gob.ar", "hash"});
        when(actor.actorActual()).thenReturn("ana@faro.gob.ar");

        listener.onPostInsert(event);

        verify(writer).registrar(AccionAuditoria.CREACION, "Usuario", 5L, "ana@faro.gob.ar",
                null, "{\"email\":\"ana@faro.gob.ar\"}");
    }

    @Test
    void registraModificacionConValoresAnterioresYNuevos() {
        EntityPersister persister = persister(OrdenTrabajo.class, "descripcion");
        PostUpdateEvent event = mock(PostUpdateEvent.class);
        when(event.getPersister()).thenReturn(persister);
        when(event.getId()).thenReturn(23L);
        when(event.getOldState()).thenReturn(new Object[]{"Poda"});
        when(event.getState()).thenReturn(new Object[]{"Poda de emergencia"});
        when(actor.actorActual()).thenReturn("capataz@faro.gob.ar");

        listener.onPostUpdate(event);

        verify(writer).registrar(AccionAuditoria.MODIFICACION, "OrdenTrabajo", 23L, "capataz@faro.gob.ar",
                "{\"descripcion\":\"Poda\"}", "{\"descripcion\":\"Poda de emergencia\"}");
    }

    @Test
    void registraEliminacionConCapturaFinalDelRegistro() {
        EntityPersister persister = persister(Usuario.class, "email");
        PostDeleteEvent event = mock(PostDeleteEvent.class);
        when(event.getPersister()).thenReturn(persister);
        when(event.getId()).thenReturn(8L);
        when(event.getDeletedState()).thenReturn(new Object[]{"baja@faro.gob.ar"});
        when(actor.actorActual()).thenReturn("admin@faro.gob.ar");

        listener.onPostDelete(event);

        verify(writer).registrar(AccionAuditoria.ELIMINACION, "Usuario", 8L, "admin@faro.gob.ar",
                "{\"email\":\"baja@faro.gob.ar\"}", null);
    }

    @Test
    void registraElBorradoDeUnComentarioYDeSuFoto() {
        PostDeleteEvent comentario = mock(PostDeleteEvent.class);
        EntityPersister persisterComentario = persister(ComentarioOrden.class, "texto");
        when(comentario.getPersister()).thenReturn(persisterComentario);
        when(comentario.getId()).thenReturn(4L);
        when(comentario.getDeletedState()).thenReturn(new Object[]{"Foto de la lámpara rota"});
        PostDeleteEvent foto = mock(PostDeleteEvent.class);
        EntityPersister persisterFoto = persister(FotoComentario.class, "archivo");
        when(foto.getPersister()).thenReturn(persisterFoto);
        when(foto.getId()).thenReturn(6L);
        when(foto.getDeletedState()).thenReturn(new Object[]{"comentarios/abc/0.jpg"});
        when(actor.actorActual()).thenReturn("encargado@faro.gob.ar");

        listener.onPostDelete(comentario);
        listener.onPostDelete(foto);

        verify(writer).registrar(AccionAuditoria.ELIMINACION, "ComentarioOrden", 4L, "encargado@faro.gob.ar",
                "{\"texto\":\"Foto de la lámpara rota\"}", null);
        verify(writer).registrar(AccionAuditoria.ELIMINACION, "FotoComentario", 6L, "encargado@faro.gob.ar",
                "{\"archivo\":\"comentarios/abc/0.jpg\"}", null);
    }

    @Test
    void ignoraEntidadesFueraDelAlcanceDeAuditoria() {
        EntityPersister persister = persister(String.class, "value");
        PostInsertEvent event = mock(PostInsertEvent.class);
        when(event.getPersister()).thenReturn(persister);

        listener.onPostInsert(event);

        verifyNoInteractions(writer, actor);
    }

    @Test
    void registraTambienLaBitacoraDeEventosDeOrden() {
        EntityPersister persister = persister(EventoOrden.class, "tipo");
        PostInsertEvent event = mock(PostInsertEvent.class);
        when(event.getPersister()).thenReturn(persister);
        when(event.getId()).thenReturn(31L);
        when(event.getState()).thenReturn(new Object[]{"CAMBIO_ESTADO"});
        when(actor.actorActual()).thenReturn("capataz@faro.gob.ar");

        listener.onPostInsert(event);

        verify(writer).registrar(AccionAuditoria.CREACION, "EventoOrden", 31L,
                "capataz@faro.gob.ar", null, "{\"tipo\":\"CAMBIO_ESTADO\"}");
    }

    private EntityPersister persister(Class<?> clase, String... propiedades) {
        EntityPersister persister = mock(EntityPersister.class);
        doReturn(clase).when(persister).getMappedClass();
        when(persister.getPropertyNames()).thenReturn(propiedades);
        return persister;
    }
}
