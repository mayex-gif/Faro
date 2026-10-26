package com.faro.backend.services;

import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.dto.UsuarioRequestDTO;
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

/** Modificación de usuarios: reglas de la cocina (UsuarioService.modificar). */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceModificacionTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService service;

    private static Usuario usuario(Long id, String email, RolUsuario rol, Long cuadrillaId, boolean activo) {
        Usuario u = new Usuario("Ana", "Martínez", email, "clave-hasheada", rol, cuadrillaId, activo);
        u.setId(id);
        return u;
    }

    private static UsuarioRequestDTO cambios(String email, RolUsuario rol, Long cuadrillaId) {
        return new UsuarioRequestDTO(" Ana María ", " Martínez ", email, rol, cuadrillaId);
    }

    private void guardarDevuelveLoMismo() {
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    @Test
    void modificarCambiaLosDatosYNoTocaLaClaveNiElEstado() {
        Usuario mesa = usuario(4L, "mesa@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null, true);
        when(usuarioRepository.findById(4L)).thenReturn(Optional.of(mesa));
        when(usuarioRepository.findByEmailIgnoreCase("ana.martinez@generalpaz.gob.ar")).thenReturn(Optional.empty());
        guardarDevuelveLoMismo();

        UsuarioDTO resultado = service.modificar(4L, cambios("Ana.Martinez@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null));

        assertEquals(new UsuarioDTO(4L, "Ana María", "Martínez", "ana.martinez@generalpaz.gob.ar",
                RolUsuario.MESA_ENTRADAS, null, true), resultado);
        assertEquals("clave-hasheada", mesa.getPassword());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void modificarDejandoSuMismoEmailNoEsRepetido() {
        Usuario mesa = usuario(4L, "mesa@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null, true);
        when(usuarioRepository.findById(4L)).thenReturn(Optional.of(mesa));
        when(usuarioRepository.findByEmailIgnoreCase("mesa@generalpaz.gob.ar")).thenReturn(Optional.of(mesa));
        guardarDevuelveLoMismo();

        UsuarioDTO resultado = service.modificar(4L, cambios("MESA@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null));

        assertEquals("mesa@generalpaz.gob.ar", resultado.email());
    }

    @Test
    void modificarConElEmailDeOtraPersonaResponde409() {
        Usuario mesa = usuario(4L, "mesa@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null, true);
        Usuario encargado = usuario(1L, "encargado@generalpaz.gob.ar", RolUsuario.ENCARGADO_CORRALON, null, true);
        when(usuarioRepository.findById(4L)).thenReturn(Optional.of(mesa));
        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(encargado));

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.modificar(4L, cambios("encargado@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null)));

        assertEquals("Ya existe un usuario con ese email", error.getMessage());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void modificarUnUsuarioQueNoExisteResponde404() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        RecursoNoEncontradoException error = assertThrows(RecursoNoEncontradoException.class,
                () -> service.modificar(99L, cambios("x@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null)));

        assertEquals("Usuario no encontrado", error.getMessage());
    }

    @Test
    void pasarAMesaAUnCapatazLeSacaLaCuadrilla() {
        Usuario capataz = usuario(2L, "capataz@generalpaz.gob.ar", RolUsuario.CAPATAZ_CUADRILLA, 1L, true);
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(capataz));
        when(usuarioRepository.findByEmailIgnoreCase("capataz@generalpaz.gob.ar")).thenReturn(Optional.of(capataz));
        guardarDevuelveLoMismo();

        UsuarioDTO resultado = service.modificar(2L, cambios("capataz@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, 1L));

        assertEquals(RolUsuario.MESA_ENTRADAS, resultado.rol());
        assertNull(resultado.cuadrillaId());
    }

    @Test
    void cambiarLaCuadrillaDeUnCapatazAUnaQueNoExisteResponde404() {
        Usuario capataz = usuario(2L, "capataz@generalpaz.gob.ar", RolUsuario.CAPATAZ_CUADRILLA, 1L, true);
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(capataz));
        when(usuarioRepository.findByEmailIgnoreCase("capataz@generalpaz.gob.ar")).thenReturn(Optional.of(capataz));
        when(cuadrillaRepository.existsById(99L)).thenReturn(false);

        assertThrows(RecursoNoEncontradoException.class,
                () -> service.modificar(2L, cambios("capataz@generalpaz.gob.ar", RolUsuario.CAPATAZ_CUADRILLA, 99L)));

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void noSeLePuedeCambiarElRolAlUltimoEncargadoActivo() {
        Usuario encargado = usuario(1L, "encargado@generalpaz.gob.ar", RolUsuario.ENCARGADO_CORRALON, null, true);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(encargado));
        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(encargado));
        when(usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON)).thenReturn(1L);

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.modificar(1L, cambios("encargado@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null)));

        assertTrue(error.getMessage().contains("último encargado activo"));
        assertEquals(RolUsuario.ENCARGADO_CORRALON, encargado.getRol());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void siHayOtroEncargadoActivoSeLePuedeCambiarElRol() {
        Usuario encargado = usuario(1L, "encargado@generalpaz.gob.ar", RolUsuario.ENCARGADO_CORRALON, null, true);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(encargado));
        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(encargado));
        when(usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON)).thenReturn(2L);
        guardarDevuelveLoMismo();

        UsuarioDTO resultado = service.modificar(1L, cambios("encargado@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null));

        assertEquals(RolUsuario.MESA_ENTRADAS, resultado.rol());
    }

    @Test
    void unEncargadoDadoDeBajaPuedeCambiarDeRolAunqueSeaElUnico() {
        Usuario encargadoDeBaja = usuario(1L, "encargado@generalpaz.gob.ar", RolUsuario.ENCARGADO_CORRALON, null, false);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(encargadoDeBaja));
        when(usuarioRepository.findByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(Optional.of(encargadoDeBaja));
        guardarDevuelveLoMismo();

        UsuarioDTO resultado = service.modificar(1L, cambios("encargado@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null));

        assertEquals(RolUsuario.MESA_ENTRADAS, resultado.rol());
        verify(usuarioRepository, never()).countByRolAndActivoTrue(any());
    }
}
