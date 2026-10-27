package com.faro.backend.services;

import com.faro.backend.dto.CrearUsuarioRequestDTO;
import com.faro.backend.dto.ModificarUsuarioRequestDTO;
import com.faro.backend.dto.UsuarioDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.RolUsuario;
import com.faro.backend.models.Usuario;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService usuarioService;

    private Usuario usuarioEncargado;
    private Usuario usuarioCapataz;

    @BeforeEach
    void setUp() {
        usuarioEncargado = new Usuario("Martín", "Gómez", "encargado@generalpaz.gob.ar", "encodedPass",
                RolUsuario.ENCARGADO_CORRALON, null, true);
        usuarioEncargado.setId(1L);

        usuarioCapataz = new Usuario("Juan", "Pérez", "capataz@generalpaz.gob.ar", "encodedPass",
                RolUsuario.CAPATAZ_CUADRILLA, 2L, true);
        usuarioCapataz.setId(2L);
    }

    @Test
    void listarSinFiltrosDevuelveTodosLosUsuarios() {
        when(usuarioRepository.findAll()).thenReturn(List.of(usuarioEncargado, usuarioCapataz));

        List<UsuarioDTO> resultado = usuarioService.listar(null, null);

        assertEquals(2, resultado.size());
        verify(usuarioRepository).findAll();
    }

    @Test
    void listarConFiltroRolDevuelveUsuariosFiltradosPorRol() {
        when(usuarioRepository.findByRol(RolUsuario.ENCARGADO_CORRALON)).thenReturn(List.of(usuarioEncargado));

        List<UsuarioDTO> resultado = usuarioService.listar(RolUsuario.ENCARGADO_CORRALON, null);

        assertEquals(1, resultado.size());
        assertEquals("Martín", resultado.get(0).nombre());
        verify(usuarioRepository).findByRol(RolUsuario.ENCARGADO_CORRALON);
    }

    @Test
    void listarConFiltroActivoDevuelveUsuariosFiltradosPorActivo() {
        when(usuarioRepository.findByActivo(true)).thenReturn(List.of(usuarioEncargado, usuarioCapataz));

        List<UsuarioDTO> resultado = usuarioService.listar(null, true);

        assertEquals(2, resultado.size());
        verify(usuarioRepository).findByActivo(true);
    }

    @Test
    void listarConFiltroRolYActivoDevuelveUsuariosFiltradosPorAmbos() {
        when(usuarioRepository.findByRolAndActivo(RolUsuario.CAPATAZ_CUADRILLA, true))
                .thenReturn(List.of(usuarioCapataz));

        List<UsuarioDTO> resultado = usuarioService.listar(RolUsuario.CAPATAZ_CUADRILLA, true);

        assertEquals(1, resultado.size());
        assertEquals("Juan", resultado.get(0).nombre());
        verify(usuarioRepository).findByRolAndActivo(RolUsuario.CAPATAZ_CUADRILLA, true);
    }

    @Test
    void obtenerPorIdExitoso() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));

        UsuarioDTO resultado = usuarioService.obtenerPorId(1L);

        assertNotNull(resultado);
        assertEquals(1L, resultado.id());
        assertEquals("encargado@generalpaz.gob.ar", resultado.email());
    }

    @Test
    void obtenerPorIdInexistenteLanzaExcepcion() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> usuarioService.obtenerPorId(99L));
    }

    @Test
    void crearUsuarioExitosoParaCapatazConCuadrillaValida() {
        CrearUsuarioRequestDTO request = new CrearUsuarioRequestDTO(
                "Carlos", "López", "carlos@generalpaz.gob.ar", "claveSegura1",
                RolUsuario.CAPATAZ_CUADRILLA, 5L, true
        );

        when(usuarioRepository.existsByEmailIgnoreCase("carlos@generalpaz.gob.ar")).thenReturn(false);
        when(cuadrillaRepository.existsById(5L)).thenReturn(true);
        when(passwordEncoder.encode("claveSegura1")).thenReturn("hashClave");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });

        UsuarioDTO resultado = usuarioService.crear(request);

        assertNotNull(resultado);
        assertEquals("carlos@generalpaz.gob.ar", resultado.email());
        assertEquals(RolUsuario.CAPATAZ_CUADRILLA, resultado.rol());
        assertEquals(5L, resultado.cuadrillaId());
        assertTrue(resultado.activo());
        verify(passwordEncoder).encode("claveSegura1");
        verify(usuarioRepository).save(any(Usuario.class));
    }

    @Test
    void crearUsuarioCapatazSinCuadrillaPermitido() {
        CrearUsuarioRequestDTO request = new CrearUsuarioRequestDTO(
                "Carlos", "López", "carlos@generalpaz.gob.ar", "claveSegura1",
                RolUsuario.CAPATAZ_CUADRILLA, null, true
        );

        when(usuarioRepository.existsByEmailIgnoreCase("carlos@generalpaz.gob.ar")).thenReturn(false);
        when(passwordEncoder.encode("claveSegura1")).thenReturn("hashClave");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioDTO resultado = usuarioService.crear(request);

        assertNotNull(resultado);
        assertNull(resultado.cuadrillaId());
        verify(cuadrillaRepository, never()).existsById(any());
    }

    @Test
    void crearUsuarioEncargadoDescartaCuadrillaId() {
        CrearUsuarioRequestDTO request = new CrearUsuarioRequestDTO(
                "Lucas", "Gómez", "lucas@generalpaz.gob.ar", "claveSegura1",
                RolUsuario.ENCARGADO_CORRALON, 5L, null
        );

        when(usuarioRepository.existsByEmailIgnoreCase("lucas@generalpaz.gob.ar")).thenReturn(false);
        when(passwordEncoder.encode("claveSegura1")).thenReturn("hashClave");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setId(11L);
            return u;
        });

        UsuarioDTO resultado = usuarioService.crear(request);

        assertNotNull(resultado);
        assertNull(resultado.cuadrillaId());
        assertTrue(resultado.activo());
        verify(cuadrillaRepository, never()).existsById(any());
    }

    @Test
    void crearUsuarioConEmailDuplicadoLanzaOperacionNoPermitidaException() {
        CrearUsuarioRequestDTO request = new CrearUsuarioRequestDTO(
                "Martín", "Gómez", "encargado@generalpaz.gob.ar", "claveSegura1",
                RolUsuario.ENCARGADO_CORRALON, null, true
        );

        when(usuarioRepository.existsByEmailIgnoreCase("encargado@generalpaz.gob.ar")).thenReturn(true);

        assertThrows(OperacionNoPermitidaException.class, () -> usuarioService.crear(request));
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void crearUsuarioCapatazConCuadrillaInexistenteLanzaRecursoNoEncontradoException() {
        CrearUsuarioRequestDTO request = new CrearUsuarioRequestDTO(
                "Carlos", "López", "carlos@generalpaz.gob.ar", "claveSegura1",
                RolUsuario.CAPATAZ_CUADRILLA, 999L, true
        );

        when(usuarioRepository.existsByEmailIgnoreCase("carlos@generalpaz.gob.ar")).thenReturn(false);
        when(cuadrillaRepository.existsById(999L)).thenReturn(false);

        assertThrows(RecursoNoEncontradoException.class, () -> usuarioService.crear(request));
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void modificarUsuarioExitosoActualizandoPassword() {
        ModificarUsuarioRequestDTO request = new ModificarUsuarioRequestDTO(
                "Martín Modificado", "Gómez", "encargado.nuevo@generalpaz.gob.ar",
                "nuevaPassword1", RolUsuario.ENCARGADO_CORRALON, null, true
        );

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));
        when(usuarioRepository.existsByEmailIgnoreCaseAndIdNot("encargado.nuevo@generalpaz.gob.ar", 1L)).thenReturn(false);
        when(passwordEncoder.encode("nuevaPassword1")).thenReturn("nuevaHash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioDTO resultado = usuarioService.modificar(1L, request, "admin@generalpaz.gob.ar");

        assertNotNull(resultado);
        assertEquals("Martín Modificado", resultado.nombre());
        assertEquals("encargado.nuevo@generalpaz.gob.ar", resultado.email());
        assertEquals("nuevaHash", usuarioEncargado.getPassword());
    }

    @Test
    void modificarUsuarioConservaPasswordSiVieneVaciaONula() {
        ModificarUsuarioRequestDTO requestVacia = new ModificarUsuarioRequestDTO(
                "Martín Modificado", "Gómez", "encargado@generalpaz.gob.ar",
                "", RolUsuario.ENCARGADO_CORRALON, null, null
        );

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioDTO resultado = usuarioService.modificar(1L, requestVacia, "admin@generalpaz.gob.ar");

        assertNotNull(resultado);
        assertEquals("encodedPass", usuarioEncargado.getPassword());
        verify(passwordEncoder, never()).encode(anyString());

        ModificarUsuarioRequestDTO requestNula = new ModificarUsuarioRequestDTO(
                "Martín Modificado", "Gómez", "encargado@generalpaz.gob.ar",
                null, RolUsuario.ENCARGADO_CORRALON, null, null
        );
        usuarioService.modificar(1L, requestNula, null);
        assertEquals("encodedPass", usuarioEncargado.getPassword());
    }

    @Test
    void modificarUsuarioConEmailEnUsoPorOtroLanzaOperacionNoPermitidaException() {
        ModificarUsuarioRequestDTO request = new ModificarUsuarioRequestDTO(
                "Martín", "Gómez", "otro@generalpaz.gob.ar",
                null, RolUsuario.ENCARGADO_CORRALON, null, true
        );

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));
        when(usuarioRepository.existsByEmailIgnoreCaseAndIdNot("otro@generalpaz.gob.ar", 1L)).thenReturn(true);

        assertThrows(OperacionNoPermitidaException.class, () -> usuarioService.modificar(1L, request, "admin@generalpaz.gob.ar"));
    }

    @Test
    void modificarUsuarioDesactivarPropiaCuentaLanzaOperacionNoPermitidaException() {
        ModificarUsuarioRequestDTO request = new ModificarUsuarioRequestDTO(
                "Martín", "Gómez", "encargado@generalpaz.gob.ar",
                null, RolUsuario.ENCARGADO_CORRALON, null, false
        );

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));

        assertThrows(OperacionNoPermitidaException.class, () -> usuarioService.modificar(1L, request, "encargado@generalpaz.gob.ar"));
    }

    @Test
    void modificarUsuarioQuitarRolAUltimoEncargadoActivoLanzaOperacionNoPermitidaException() {
        ModificarUsuarioRequestDTO request = new ModificarUsuarioRequestDTO(
                "Martín", "Gómez", "encargado@generalpaz.gob.ar",
                null, RolUsuario.MESA_ENTRADAS, null, true
        );

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));
        when(usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON)).thenReturn(1L);

        assertThrows(OperacionNoPermitidaException.class, () -> usuarioService.modificar(1L, request, "otro@generalpaz.gob.ar"));
    }

    @Test
    void cambiarEstadoActivoExitoso() {
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(usuarioCapataz));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioDTO resultado = usuarioService.cambiarEstadoActivo(2L, false, "encargado@generalpaz.gob.ar");

        assertNotNull(resultado);
        assertFalse(resultado.activo());
        assertFalse(usuarioCapataz.isActivo());
    }

    @Test
    void cambiarEstadoActivoConEmailOperadorNull() {
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(usuarioCapataz));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        UsuarioDTO resultado = usuarioService.cambiarEstadoActivo(2L, true, null);

        assertNotNull(resultado);
        assertTrue(resultado.activo());
    }

    @Test
    void cambiarEstadoActivoAutoDesactivacionLanzaOperacionNoPermitidaException() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));

        assertThrows(OperacionNoPermitidaException.class, () ->
                usuarioService.cambiarEstadoActivo(1L, false, "encargado@generalpaz.gob.ar"));
    }

    @Test
    void cambiarEstadoActivoDesactivarUnicoEncargadoLanzaOperacionNoPermitidaException() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));
        when(usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON)).thenReturn(1L);

        assertThrows(OperacionNoPermitidaException.class, () ->
                usuarioService.cambiarEstadoActivo(1L, false, "otro.admin@generalpaz.gob.ar"));
    }

    @Test
    void eliminarUsuarioExitoso() {
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(usuarioCapataz));

        usuarioService.eliminar(2L, "encargado@generalpaz.gob.ar");

        verify(usuarioRepository).delete(usuarioCapataz);
    }

    @Test
    void eliminarUsuarioConEmailOperadorNull() {
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(usuarioCapataz));

        usuarioService.eliminar(2L, null);

        verify(usuarioRepository).delete(usuarioCapataz);
    }

    @Test
    void eliminarUsuarioAutoEliminacionLanzaOperacionNoPermitidaException() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));

        assertThrows(OperacionNoPermitidaException.class, () ->
                usuarioService.eliminar(1L, "encargado@generalpaz.gob.ar"));
        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    void eliminarUsuarioUnicoEncargadoLanzaOperacionNoPermitidaException() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioEncargado));
        when(usuarioRepository.countByRolAndActivoTrue(RolUsuario.ENCARGADO_CORRALON)).thenReturn(1L);

        assertThrows(OperacionNoPermitidaException.class, () ->
                usuarioService.eliminar(1L, "otro.admin@generalpaz.gob.ar"));
        verify(usuarioRepository, never()).delete(any());
    }
}
