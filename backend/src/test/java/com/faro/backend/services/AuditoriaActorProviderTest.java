package com.faro.backend.services;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuditoriaActorProviderTest {

    private final AuditoriaActorProvider provider = new AuditoriaActorProvider();

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usaElNombreDelUsuarioAutenticado() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("ana@faro.gob.ar", null, List.of()));

        assertEquals("ana@faro.gob.ar", provider.actorActual());
    }

    @Test
    void usaSistemaCuandoNoHayAutenticacion() {
        assertEquals("SISTEMA", provider.actorActual());
    }

    @Test
    void usaSistemaParaUnaSesionAnonima() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("key",
                "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));

        assertEquals("SISTEMA", provider.actorActual());
    }

    @Test
    void usaSistemaSiElNombreEstaVacio() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(" ", null, List.of()));

        assertEquals("SISTEMA", provider.actorActual());
    }
}
