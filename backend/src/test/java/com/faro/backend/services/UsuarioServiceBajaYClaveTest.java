package com.faro.backend.services;

import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Baja, reactivación y restablecer clave: reglas de la cocina (UsuarioService). */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceBajaYClaveTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService service;

    private static Usuario usuario(Long id, RolUsuario rol, boolean activo) {
        Usuario u = new Usuario("Ana", "Martínez", "usuario" + id + "@generalpaz.gob.ar", "clave-hasheada", rol, null, activo);
        u.setId(id);
        return u;
    }

    /** Quien hace el pedido: el encargado con id 1. */
    private static final Usuario ENCARGADO = usuario(1L, RolUsuario.ENCARGADO_CORRALON, true);

    private void guardarDevuelveLoMismo() {
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    // ---------- Baja / reactivar ----------

    @Test
    void darDeBajaDejaLaCuentaInactivaSinBorrarla() {
        Usuario mesa = usuario(4L, RolUsuario.MESA_ENTRADAS, true);
        when(usuarioRepository.findById(4L)).thenReturn(Optional.of(mesa));
        guardarDevuelveLoMismo();

        UsuarioDTO resultado = service.cambiarActivo(4L, false, ENCARGADO);

        assertFalse(resultado.activo());
        assertFalse(mesa.isActivo());
        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    void reactivarVuelveAActivarLaCuenta() {
        Usuario mesaDeBaja = usuario(4L, RolUsuario.MESA_ENTRADAS, false);
        when(usuarioRepository.findById(4L)).thenReturn(Optional.of(mesaDeBaja));
        guardarDevuelveLoMismo();

        UsuarioDTO resultado = service.cambiarActivo(4L, true, ENCARGADO);

        assertTrue(resultado.activo());
    }

    @Test
    void nadieSePuedeDarDeBajaASiMismo() {
        Usuario mesa = usuario(4L, RolUsuario.MESA_ENTRADAS, true);
        when(usuarioRepository.findById(4L)).thenReturn(Optional.of(mesa));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.cambiarActivo(4L, false, mesa));

        assertEquals("No te podés dar de baja a vos mismo", error.getMessage());
        assertTrue(mesa.isActivo());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void noSePuedeDarDeBajaAlUltimoEncargadoActivo() {
        Usuario unicoEncargado = usuario(2L, RolUsuario.ENCARGADO_CORRALON, true);
        Usuario mesa = usuario(4L, RolUsuario.MESA_ENTRADAS, true);
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(unicoEncargado));
        when(usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON)).thenReturn(1L);

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.cambiarActivo(2L, false, mesa));

        assertTrue(error.getMessage().contains("último encargado activo"));
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void siHayOtroEncargadoActivoSePuedeDarDeBajaAUnEncargado() {
        Usuario otroEncargado = usuario(2L, RolUsuario.ENCARGADO_CORRALON, true);
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(otroEncargado));
        when(usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON)).thenReturn(2L);
        guardarDevuelveLoMismo();

        assertFalse(service.cambiarActivo(2L, false, ENCARGADO).activo());
    }

    @Test
    void darDeBajaAUnUsuarioQueNoExisteResponde404() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> service.cambiarActivo(99L, false, ENCARGADO));
    }

    // ---------- Restablecer clave ----------

    @Test
    void restablecerClaveGuardaLaClaveNuevaEncriptada() {
        Usuario capataz = usuario(3L, RolUsuario.CAPATAZ_CUADRILLA, true);
        when(usuarioRepository.findById(3L)).thenReturn(Optional.of(capataz));
        when(passwordEncoder.encode("clave-nueva-123")).thenReturn("clave-nueva-encriptada");

        service.restablecerClave(3L, "clave-nueva-123");

        assertEquals("clave-nueva-encriptada", capataz.getPassword());
        verify(usuarioRepository).save(capataz);
    }

    @Test
    void restablecerLaClaveDeUnUsuarioQueNoExisteResponde404() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> service.restablecerClave(99L, "clave-nueva-123"));

        verifyNoInteractions(passwordEncoder);
    }
}
