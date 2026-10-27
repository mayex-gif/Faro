package com.faro.backend.config.security;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.*;

class UsuarioDetallesTest {

    @Test
    void mapeaCorrectamenteCamposDeUsuarioYAutoridades() {
        Usuario usuario = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "encodedPassword123",
                RolUsuario.ENCARGADO_CORRALON, null, true);

        UsuarioDetalles detalles = new UsuarioDetalles(usuario);

        assertEquals("encargado@generalpaz.gob.ar", detalles.getUsername());
        assertEquals("encodedPassword123", detalles.getPassword());
        assertSame(usuario, detalles.getUsuario());

        Collection<? extends GrantedAuthority> authorities = detalles.getAuthorities();
        assertNotNull(authorities);
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ENCARGADO_CORRALON")));
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("PERMISO_GESTIONAR_USUARIOS")));
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("PERMISO_ASIGNAR_CUADRILLA")));

        assertTrue(detalles.isAccountNonExpired());
        assertTrue(detalles.isAccountNonLocked());
        assertTrue(detalles.isCredentialsNonExpired());
        assertTrue(detalles.isEnabled());
    }

    @Test
    void isEnabledReflejaElEstadoActivoDelUsuario() {
        Usuario usuarioInactivo = new Usuario("Carlos", "Rodríguez", "capataz@generalpaz.gob.ar", "pass",
                RolUsuario.CAPATAZ_CUADRILLA, 1L, false);

        UsuarioDetalles detalles = new UsuarioDetalles(usuarioInactivo);

        assertFalse(detalles.isEnabled());
    }

    @Test
    void usuarioConRolNullDevuelveListaVaciaDeAutoridades() {
        Usuario usuarioSinRol = new Usuario("Sin", "Rol", "sinrol@generalpaz.gob.ar", "pass", null, null, true);
        UsuarioDetalles detalles = new UsuarioDetalles(usuarioSinRol);

        assertTrue(detalles.getAuthorities().isEmpty());
    }
}
