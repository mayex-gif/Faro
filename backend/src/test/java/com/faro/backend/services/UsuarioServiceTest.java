package com.faro.backend.services;

import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private UsuarioService service;

    @Test
    void listarDevuelveTodoElPersonalComoDtoOrdenadoPorApellidoYNombre() {
        Usuario encargado = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "clave-hasheada",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        encargado.setId(1L);
        Usuario capatazDeBaja = new Usuario("Carlos", "Rodríguez", "capataz.verde@generalpaz.gob.ar", "clave-hasheada",
                RolUsuario.CAPATAZ_CUADRILLA, 2L, false);
        capatazDeBaja.setId(2L);

        when(usuarioRepository.findAll(Sort.by("apellido", "nombre"))).thenReturn(List.of(encargado, capatazDeBaja));

        List<UsuarioDTO> resultado = service.listar();

        assertEquals(2, resultado.size());
        assertEquals(new UsuarioDTO(1L, "Martín", "Gómez", "encargado@generalpaz.gob.ar",
                RolUsuario.ENCARGADO_CORRALON, null, true), resultado.get(0));
        // Los dados de baja también se listan (para poder reactivarlos).
        assertEquals(RolUsuario.CAPATAZ_CUADRILLA, resultado.get(1).rol());
        assertEquals(2L, resultado.get(1).cuadrillaId());
        assertFalse(resultado.get(1).activo());
    }

    @Test
    void listarSinUsuariosDevuelveListaVacia() {
        when(usuarioRepository.findAll(any(Sort.class))).thenReturn(List.of());

        assertTrue(service.listar().isEmpty());
    }
}