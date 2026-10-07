package com.faro.backend.services;

import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitarios del OrdenTrabajoService.
 * Los dos repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServiceTest {

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

    @InjectMocks
    private OrdenTrabajoService service;

    // ===================== Ayudantes =====================

    private PuntoInfraestructura lugar(Long id, String nombre) {
        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setId(id);
        lugar.setNombre(nombre);
        return lugar;
    }

    private OrdenTrabajo orden(Long id, String descripcion, PuntoInfraestructura lugar) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(id);
        orden.setDescripcion(descripcion);
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(lugar);
        orden.setFechaCreacion(LocalDateTime.of(2026, 10, 1, 10, 0));
        return orden;
    }

    // Lo que mandaría la pantalla
    private OrdenTrabajoRequestDTO pedido(String descripcion, Long lugarId) {
        return new OrdenTrabajoRequestDTO(descripcion, TipoTrabajo.CORTE_DE_PASTO,
                OrigenOrden.RECLAMO_VECINAL, PrioridadOrden.ALTA, lugarId);
    }

    // ===================== CONSULTAS =====================

    @Test
    void listar_devuelveLasOrdenesConElNombreDelLugar() {
        when(ordenRepository.findAll(any(Sort.class)))
                .thenReturn(List.of(orden(1L, "Podar el fresno", lugar(3L, "Plaza San Martín"))));

        List<OrdenTrabajoDTO> resultado = service.listar();

        assertEquals(1, resultado.size());
        assertEquals("Podar el fresno", resultado.get(0).descripcion());
        assertEquals(3L, resultado.get(0).lugarId());
        assertEquals("Plaza San Martín", resultado.get(0).lugarNombre());
    }

    @Test
    void listarPorLugar_existente_devuelveSoloSusOrdenes() {
        PuntoInfraestructura plaza = lugar(3L, "Plaza San Martín");
        when(lugarRepository.existsById(3L)).thenReturn(true);
        when(ordenRepository.findByLugarIdOrderByFechaCreacionDesc(3L))
                .thenReturn(List.of(orden(1L, "Podar", plaza), orden(2L, "Pintar bancos", plaza)));

        List<OrdenTrabajoDTO> resultado = service.listarPorLugar(3L);

        assertEquals(2, resultado.size());
    }

    @Test
    void listarPorLugar_inexistente_lanzaNoEncontrado() {
        when(lugarRepository.existsById(99L)).thenReturn(false);

        assertThrows(RecursoNoEncontradoException.class, () -> service.listarPorLugar(99L));
        // ni siquiera tiene que buscar las OT
        verify(ordenRepository, never()).findByLugarIdOrderByFechaCreacionDesc(any());
    }

    @Test
    void obtener_existente_devuelveLaOrden() {
        when(ordenRepository.findById(1L))
                .thenReturn(Optional.of(orden(1L, "Podar el fresno", lugar(3L, "Plaza"))));

        OrdenTrabajoDTO resultado = service.obtener(1L);

        assertEquals(1L, resultado.id());
        assertEquals("Podar el fresno", resultado.descripcion());
    }

    @Test
    void obtener_inexistente_lanzaNoEncontrado() {
        when(ordenRepository.findById(99L)).thenReturn(Optional.empty());

        RecursoNoEncontradoException error = assertThrows(RecursoNoEncontradoException.class,
                () -> service.obtener(99L));

        assertEquals("Orden de trabajo no encontrada", error.getMessage());
    }

    // ===================== ALTA =====================

    @Test
    void crear_conLugarExistente_guardaLaOrdenConSusDatos() {
        PuntoInfraestructura plaza = lugar(3L, "Plaza San Martín");
        when(lugarRepository.findById(3L)).thenReturn(Optional.of(plaza));
        EstadoOrden pendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
        pendiente.setId(1L);
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.of(pendiente));
        // simulamos a la base: lo que llega a save() vuelve con id 10
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> {
            OrdenTrabajo guardada = invocacion.getArgument(0);
            guardada.setId(10L);
            return guardada;
        });

        // la descripción viene con espacios de más: el Service los tiene que sacar
        OrdenTrabajoDTO resultado = service.crear(pedido("  Cortar pasto  ", 3L));

        // Verificamos la respuesta
        assertEquals(10L, resultado.id());
        assertEquals("Cortar pasto", resultado.descripcion());
        assertEquals(TipoTrabajo.CORTE_DE_PASTO, resultado.tipo());
        assertEquals(OrigenOrden.RECLAMO_VECINAL, resultado.origen());
        assertEquals(PrioridadOrden.ALTA, resultado.prioridad());
        assertEquals("Plaza San Martín", resultado.lugarNombre());
        assertEquals("Pendiente", resultado.estadoNombre()); // arrancó en el estado inicial
        assertEquals("#566A73", resultado.estadoColor());

        // Y con el captor revisamos QUÉ se le pidió guardar a la base
        ArgumentCaptor<OrdenTrabajo> captor = ArgumentCaptor.forClass(OrdenTrabajo.class);
        verify(ordenRepository).save(captor.capture());
        assertSame(plaza, captor.getValue().getLugar()); // quedó atada al lugar correcto
    }

    @Test
    void crear_conLugarInexistente_lanzaErrorYNoGuarda() {
        when(lugarRepository.findById(99L)).thenReturn(Optional.empty());

        RecursoNoEncontradoException error = assertThrows(RecursoNoEncontradoException.class,
                () -> service.crear(pedido("Cortar pasto", 99L)));

        assertEquals("Lugar no encontrado", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    void crear_sinEstadoInicialConfigurado_lanzaErrorYNoGuarda() {
        when(lugarRepository.findById(3L)).thenReturn(Optional.of(lugar(3L, "Plaza")));
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.empty());

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> service.crear(pedido("Cortar pasto", 3L)));

        assertEquals("No hay un estado inicial configurado", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    // ===================== MODIFICACIÓN =====================

    @Test
    void modificar_existente_actualizaLosDatosYPuedeCambiarDeLugar() {
        OrdenTrabajo existente = orden(5L, "Descripción vieja", lugar(3L, "Plaza San Martín"));
        PuntoInfraestructura otroLugar = lugar(4L, "Plazoleta Belgrano");
        when(ordenRepository.findById(5L)).thenReturn(Optional.of(existente));
        when(lugarRepository.findById(4L)).thenReturn(Optional.of(otroLugar));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        OrdenTrabajoDTO resultado = service.modificar(5L, pedido("Descripción nueva", 4L));

        assertEquals(5L, resultado.id()); // el id no cambia
        assertEquals("Descripción nueva", resultado.descripcion());
        assertEquals(PrioridadOrden.ALTA, resultado.prioridad());
        assertEquals(4L, resultado.lugarId());
        assertEquals("Plazoleta Belgrano", resultado.lugarNombre());
    }

    @Test
    void modificar_inexistente_lanzaErrorYNoGuarda() {
        when(ordenRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class,
                () -> service.modificar(99L, pedido("Da igual", 3L)));

        verify(ordenRepository, never()).save(any());
    }
}