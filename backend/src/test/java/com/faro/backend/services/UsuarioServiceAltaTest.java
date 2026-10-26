package com.faro.backend.services;

import com.faro.backend.dto.UsuarioAltaRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Alta de usuarios: reglas de la cocina (UsuarioService.crear). */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceAltaTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService service;

    private static UsuarioAltaRequestDTO alta(String email, RolUsuario rol, Long cuadrillaId) {
        return new UsuarioAltaRequestDTO("  Lucía ", " Fernández ", email, rol, cuadrillaId, "clave-de-prueba");
    }

    /** El repositorio devuelve lo mismo que recibe, con id 10 (como haría la base). */
    private void guardarDevuelveConId() {
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacion -> {
            Usuario u = invocacion.getArgument(0);
            u.setId(10L);
            return u;
        });
    }

    @Test
    void crearGuardaLaClaveEncriptadaElEmailEnMinusculasYLaCuentaActiva() {
        when(usuarioRepository.existsByEmailIgnoreCase("lucia@generalpaz.gob.ar")).thenReturn(false);
        when(passwordEncoder.encode("clave-de-prueba")).thenReturn("clave-encriptada");
        guardarDevuelveConId();

        UsuarioDTO resultado = service.crear(alta(" Lucia@GeneralPaz.gob.ar ", RolUsuario.MESA_ENTRADAS, null));

        ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(guardado.capture());
        assertEquals("clave-encriptada", guardado.getValue().getPassword());
        assertEquals("lucia@generalpaz.gob.ar", guardado.getValue().getEmail());
        assertEquals("Lucía", guardado.getValue().getNombre());
        assertEquals("Fernández", guardado.getValue().getApellido());
        assertTrue(guardado.getValue().isActivo());

        assertEquals(new UsuarioDTO(10L, "Lucía", "Fernández", "lucia@generalpaz.gob.ar",
                RolUsuario.MESA_ENTRADAS, null, true), resultado);
    }

    @Test
    void crearConEmailRepetidoResponde409YNoGuarda() {
        when(usuarioRepository.existsByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(true);

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.crear(alta("ENCARGADO@generalpaz.gob.ar", RolUsuario.MESA_ENTRADAS, null)));

        assertEquals("Ya existe un usuario con ese email", error.getMessage());
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void crearUnCapatazConSuCuadrillaLaGuarda() {
        when(usuarioRepository.existsByEmailIgnoreCase("lucia@generalpaz.gob.ar")).thenReturn(false);
        when(cuadrillaRepository.existsById(2L)).thenReturn(true);
        when(passwordEncoder.encode("clave-de-prueba")).thenReturn("clave-encriptada");
        guardarDevuelveConId();

        UsuarioDTO resultado = service.crear(alta("lucia@generalpaz.gob.ar", RolUsuario.CAPATAZ_CUADRILLA, 2L));

        assertEquals(RolUsuario.CAPATAZ_CUADRILLA, resultado.rol());
        assertEquals(2L, resultado.cuadrillaId());
    }

    @Test
    void crearUnCapatazSinCuadrillaResponde409() {
        when(usuarioRepository.existsByEmailIgnoreCase("lucia@generalpaz.gob.ar")).thenReturn(false);

        OperacionNoPermitidaException error = assertThrows(OperacionNoPermitidaException.class,
                () -> service.crear(alta("lucia@generalpaz.gob.ar", RolUsuario.CAPATAZ_CUADRILLA, null)));

        assertEquals("El capataz tiene que tener una cuadrilla a cargo", error.getMessage());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void crearUnCapatazConUnaCuadrillaQueNoExisteResponde404() {
        when(usuarioRepository.existsByEmailIgnoreCase("lucia@generalpaz.gob.ar")).thenReturn(false);
        when(cuadrillaRepository.existsById(99L)).thenReturn(false);

        assertThrows(RecursoNoEncontradoException.class,
                () -> service.crear(alta("lucia@generalpaz.gob.ar", RolUsuario.CAPATAZ_CUADRILLA, 99L)));

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void crearOtroRolConCuadrillaLaIgnora() {
        when(usuarioRepository.existsByEmailIgnoreCase("lucia@generalpaz.gob.ar")).thenReturn(false);
        when(passwordEncoder.encode("clave-de-prueba")).thenReturn("clave-encriptada");
        guardarDevuelveConId();

        UsuarioDTO resultado = service.crear(alta("lucia@generalpaz.gob.ar", RolUsuario.ENCARGADO_CORRALON, 2L));

        assertNull(resultado.cuadrillaId());
        verifyNoInteractions(cuadrillaRepository);
    }
}
