package com.faro.backend.services;

import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.SinPermisoException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static com.faro.backend.config.security.UsuariosDePrueba.capataz;
import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static com.faro.backend.config.security.UsuariosDePrueba.mesaDeEntradas;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests de la regla "el capataz solo cambia el estado de las órdenes de SU cuadrilla" (en el service = la cocina).
 * La orden 7 es de la Cuadrilla Verde (id 1). Todos los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServicePermisosTest {

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Mock
    private PuntoInfraestructuraRepository lugarRepository;

    @Mock
    private EstadoOrdenRepository estadoRepository;

    @Mock
    private TransicionEstadoRepository transicionRepository;

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @Mock
    private EventoOrdenRepository eventoRepository;

    @InjectMocks
    private OrdenTrabajoService service;

    private static final CambioEstadoRequestDTO A_EN_CURSO = new CambioEstadoRequestDTO(3L);

    // ===================== Ayudantes =====================

    private static EstadoOrden estado(Long id, String nombre) {
        EstadoOrden estado = new EstadoOrden(nombre, "#000000", id == 1L, false, id.intValue());
        estado.setId(id);
        return estado;
    }

    private final EstadoOrden planificada = estado(2L, "Planificada");
    private final EstadoOrden enCurso = estado(3L, "En curso");

    /** Orden 7, Planificada, asignada a la cuadrilla con ese id (o sin cuadrilla si es null). */
    private OrdenTrabajo ordenDeLaCuadrilla(Long cuadrillaId) {
        PuntoInfraestructura plaza = new PuntoInfraestructura();
        plaza.setId(3L);
        plaza.setNombre("Plaza San Martín");

        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(7L);
        orden.setDescripcion("Podar el fresno");
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(plaza);
        orden.setEstado(planificada);
        if (cuadrillaId != null) {
            Cuadrilla cuadrilla = new Cuadrilla();
            cuadrilla.setId(cuadrillaId);
            cuadrilla.setNombre("Cuadrilla " + cuadrillaId);
            orden.setCuadrilla(cuadrilla);
        }
        return orden;
    }

    /** Deja preparado un cambio Planificada → En curso que el motor de estados acepta. */
    private void caminoPermitido(OrdenTrabajo orden) {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(orden));
        when(estadoRepository.findById(3L)).thenReturn(Optional.of(enCurso));
        when(transicionRepository.existsByOrigenIdAndDestinoId(2L, 3L)).thenReturn(true);
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    // ===================== Capataz =====================

    @Test
    void elCapatazPuedeEmpezarUnaOrdenDeSuCuadrilla() {
        OrdenTrabajo orden = ordenDeLaCuadrilla(1L);
        caminoPermitido(orden);

        OrdenTrabajoDTO resultado = service.cambiarEstado(7L, A_EN_CURSO, capataz(1L).getUsuario());

        assertEquals("En curso", resultado.estadoNombre());
        verify(ordenRepository).save(orden);
    }

    @Test
    void elCapatazNoPuedeCambiarUnaOrdenDeOtraCuadrilla() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenDeLaCuadrilla(1L)));
        Usuario capatazDeAlumbrado = capataz(2L).getUsuario();

        SinPermisoException error = assertThrows(SinPermisoException.class,
                () -> service.cambiarEstado(7L, A_EN_CURSO, capatazDeAlumbrado));

        assertEquals("Esta orden no es de tu cuadrilla", error.getMessage());
        verify(ordenRepository, never()).save(any());
        verify(eventoRepository, never()).save(any());
    }

    @Test
    void elCapatazNoPuedeCambiarUnaOrdenSinCuadrilla() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenDeLaCuadrilla(null)));
        Usuario capatazVerde = capataz(1L).getUsuario();

        SinPermisoException error = assertThrows(SinPermisoException.class,
                () -> service.cambiarEstado(7L, A_EN_CURSO, capatazVerde));

        assertEquals("Esta orden no es de tu cuadrilla", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    void unCapatazSinCuadrillaEnSuCuentaNoPuedeCambiarNinguna() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenDeLaCuadrilla(1L)));
        Usuario capatazSinCuadrilla = capataz(null).getUsuario();

        assertThrows(SinPermisoException.class,
                () -> service.cambiarEstado(7L, A_EN_CURSO, capatazSinCuadrilla));

        verify(ordenRepository, never()).save(any());
    }

    // ===================== Encargado y otros roles =====================

    @Test
    void elEncargadoPuedeCambiarCualquierOrden() {
        OrdenTrabajo orden = ordenDeLaCuadrilla(2L);
        caminoPermitido(orden);

        OrdenTrabajoDTO resultado = service.cambiarEstado(7L, A_EN_CURSO, encargado().getUsuario());

        assertEquals("En curso", resultado.estadoNombre());
    }

    @Test
    void mesaDeEntradasNoPuedeCambiarElEstado() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenDeLaCuadrilla(1L)));
        Usuario mesa = mesaDeEntradas().getUsuario();

        SinPermisoException error = assertThrows(SinPermisoException.class,
                () -> service.cambiarEstado(7L, A_EN_CURSO, mesa));

        assertEquals("Tu rol no puede cambiar el estado de las órdenes", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    void sinUsuarioNoSeCambiaNada() {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenDeLaCuadrilla(1L)));

        assertThrows(SinPermisoException.class, () -> service.cambiarEstado(7L, A_EN_CURSO, null));

        verify(ordenRepository, never()).save(any());
    }
}
