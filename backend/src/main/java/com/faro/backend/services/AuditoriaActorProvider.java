package com.faro.backend.services;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resuelve el usuario autenticado que originó la operación actual. */
@Component
public class AuditoriaActorProvider {

    private static final String ACTOR_SISTEMA = "SISTEMA";

    public String actorActual() {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacion == null || !autenticacion.isAuthenticated()
                || autenticacion instanceof AnonymousAuthenticationToken) {
            return ACTOR_SISTEMA;
        }
        String nombre = autenticacion.getName();
        return nombre == null || nombre.isBlank() ? ACTOR_SISTEMA : nombre;
    }
}
