package com.faro.backend.config;

import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InicializadorUsuariosTest {

    private static final String CLAVE_TEST = "testClaveSegura123!";

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private InicializadorUsuarios inicializador;

    @BeforeEach
    void setUp() {
        inicializador = new InicializadorUsuarios(usuarioRepository, passwordEncoder, CLAVE_TEST);
    }

    @Test
    @SuppressWarnings("unchecked")
    void conTablaVacia_cargaLosCuatroUsuariosPorDefecto() {
        when(usuarioRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode(CLAVE_TEST)).thenReturn("$2a$10$encodedHashEjemplo");

        inicializador.run();

        ArgumentCaptor<List<Usuario>> captor = ArgumentCaptor.forClass(List.class);
        verify(usuarioRepository).saveAll(captor.capture());
        List<Usuario> guardados = captor.getValue();

        assertEquals(4, guardados.size());
        assertEquals("encargado@generalpaz.gob.ar", guardados.get(0).getEmail());
        assertEquals(RolUsuario.ENCARGADO_CORRALON, guardados.get(0).getRol());
        assertEquals("$2a$10$encodedHashEjemplo", guardados.get(0).getPassword());
        assertTrue(guardados.get(0).isActivo());

        assertEquals("capataz.verde@generalpaz.gob.ar", guardados.get(1).getEmail());
        assertEquals(1L, guardados.get(1).getCuadrillaId());
        assertEquals(RolUsuario.CAPATAZ_CUADRILLA, guardados.get(1).getRol());

        assertEquals("capataz.alumbrado@generalpaz.gob.ar", guardados.get(2).getEmail());
        assertEquals(2L, guardados.get(2).getCuadrillaId());

        assertEquals("mesadeentradas@generalpaz.gob.ar", guardados.get(3).getEmail());
        assertEquals(RolUsuario.MESA_ENTRADAS, guardados.get(3).getRol());
    }

    @Test
    void conUsuariosExistentes_noInsertaNada() {
        when(usuarioRepository.count()).thenReturn(2L);

        inicializador.run();

        verify(usuarioRepository, never()).saveAll(any());
        verify(passwordEncoder, never()).encode(any());
    }
}
