package com.faro.backend.services;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.dto.PuntoInfraestructuraDTO;
import com.faro.backend.dto.PuntoInfraestructuraRequestDTO;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests unitarios del PuntoInfraestructuraService.
 * El Repository es un "mock" (objeto falso): no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class) // activa Mockito en esta clase
class PuntoInfraestructuraServiceTest {

    private static final GeometryFactory FABRICA = new GeometryFactory(new PrecisionModel(), 4326);

    @Mock // Mockito crea un Repository FALSO
    private PuntoInfraestructuraRepository repository;
    @Mock // Repository de OT FALSO: lo usa eliminarLugar para ver si el lugar tiene OT
    private OrdenTrabajoRepository ordenRepository;
    @InjectMocks // Mockito crea el Service DE VERDAD y le pasa el Repository falso
    private PuntoInfraestructuraService service;

    // ===================== Ayudantes =====================
    // Métodos cortitos para no repetir código en cada test

    private Point punto(double longitud, double latitud) {
        return FABRICA.createPoint(new Coordinate(longitud, latitud));
    }

    private PuntoInfraestructura lugar(Long id, String nombre, String tipo, boolean funciona) {
        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setId(id);
        lugar.setNombre(nombre);
        lugar.setTipo(tipo);
        lugar.setDatosTecnicos("Datos de prueba");
        lugar.setEstadoOperativo(funciona);
        lugar.setUbicacion(punto(-58.3816, -34.6037));
        return lugar;
    }

    // ===================== CONSULTA =====================

    @Test
    void obtenerTodos_devuelveTodosLosLugaresComoDto() {
        // Preparar: el Repository falso "tiene" 2 lugares
        when(repository.findAll()).thenReturn(List.of(
                lugar(1L, "Luminaria #102", "LUMINARIA", true),
                lugar(2L, "Plaza San Martín", "ESPACIO_VERDE", false)));

        // Ejecutar
        List<PuntoInfraestructuraDTO> resultado = service.obtenerTodos();

        // Verificar
        assertEquals(2, resultado.size());
        assertEquals("Luminaria #102", resultado.get(0).nombre());
        assertEquals("ESPACIO_VERDE", resultado.get(1).tipo());
        assertFalse(resultado.get(1).estadoOperativo());
    }

    @Test
    void obtenerTodos_sinLugares_devuelveListaVacia() {
        when(repository.findAll()).thenReturn(List.of());

        List<PuntoInfraestructuraDTO> resultado = service.obtenerTodos();

        assertTrue(resultado.isEmpty());
    }

    @Test
    void obtenerInfraestructuraActiva_pideSoloLosQueFuncionan() {
        when(repository.findByTipoAndEstadoOperativo("LUMINARIA", true))
                .thenReturn(List.of(lugar(1L, "Luminaria #102", "LUMINARIA", true)));

        List<PuntoInfraestructuraDTO> resultado = service.obtenerInfraestructuraActiva("LUMINARIA");

        assertEquals(1, resultado.size());
        // Verificamos que el Service haya pedido "los que funcionan" (true)
        verify(repository).findByTipoAndEstadoOperativo("LUMINARIA", true);
    }

    // ===================== ALTA =====================

    @Test
    void crearLugar_guardaLosDatosYDevuelveElLugarConId() {
        // Preparar: lo que mandaría la pantalla
        PuntoInfraestructuraRequestDTO pedido = new PuntoInfraestructuraRequestDTO(
                "Luminaria #200", "LUMINARIA", "LED 100W", true, punto(-58.40, -34.61));

        // Simulamos a la base: lo que llega a save() vuelve con el id 10 asignado
        when(repository.save(any(PuntoInfraestructura.class))).thenAnswer(invocacion -> {
            PuntoInfraestructura guardado = invocacion.getArgument(0);
            guardado.setId(10L);
            return guardado;
        });

        // Ejecutar
        PuntoInfraestructuraDTO resultado = service.crearLugar(pedido);

        // Verificar: que devuelva el id nuevo y los mismos datos que mandamos
        assertEquals(10L, resultado.id());
        assertEquals("Luminaria #200", resultado.nombre());
        assertEquals("LUMINARIA", resultado.tipo());
        assertEquals("LED 100W", resultado.datosTecnicos());
        assertTrue(resultado.estadoOperativo());
        assertEquals(pedido.ubicacion(), resultado.ubicacion());
        // y que realmente se haya pedido guardar
        verify(repository).save(any(PuntoInfraestructura.class));
    }

    // ===================== MODIFICACIÓN =====================

    @Test
    void modificarLugar_existente_actualizaTodosLosDatos() {
        PuntoInfraestructura existente = lugar(5L, "Nombre viejo", "LUMINARIA", true);
        when(repository.findById(5L)).thenReturn(Optional.of(existente));
        // save() devuelve lo mismo que recibe
        when(repository.save(any(PuntoInfraestructura.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        PuntoInfraestructuraRequestDTO cambios = new PuntoInfraestructuraRequestDTO(
                "Nombre nuevo", "LUMINARIA", "Lámpara cambiada", false, punto(-58.50, -34.70));

        PuntoInfraestructuraDTO resultado = service.modificarLugar(5L, cambios);

        assertEquals(5L, resultado.id()); // el id no cambia
        assertEquals("Nombre nuevo", resultado.nombre());
        assertEquals("Lámpara cambiada", resultado.datosTecnicos());
        assertFalse(resultado.estadoOperativo());
        assertEquals(cambios.ubicacion(), resultado.ubicacion());
    }

    @Test
    void modificarLugar_inexistente_lanzaErrorYNoGuardaNada() {
        // Preparar: el Repository falso no encuentra el id 99
        when(repository.findById(99L)).thenReturn(Optional.empty());
        PuntoInfraestructuraRequestDTO cambios = new PuntoInfraestructuraRequestDTO(
                "Da igual", "CALLE", null, true, punto(0, 0));

        // Ejecutar + Verificar: tiene que tirar un error
        RuntimeException error = assertThrows(RuntimeException.class,
                () -> service.modificarLugar(99L, cambios));

        assertEquals("Lugar no encontrado", error.getMessage());
        // y NUNCA tiene que haber intentado guardar
        verify(repository, never()).save(any());
    }

    // ===================== BAJA =====================

        @Test
    void eliminarLugar_sinOrdenes_loBorra() {
        when(repository.existsById(3L)).thenReturn(true);
        when(ordenRepository.existsByLugarId(3L)).thenReturn(false);

        service.eliminarLugar(3L);

        verify(repository).deleteById(3L);
    }

    @Test
    void eliminarLugar_conOrdenes_lanzaErrorYNoBorra() {
        when(repository.existsById(3L)).thenReturn(true);
        when(ordenRepository.existsByLugarId(3L)).thenReturn(true);

        assertThrows(OperacionNoPermitidaException.class, () -> service.eliminarLugar(3L));
        verify(repository, never()).deleteById(any());
    }

    @Test
    void eliminarLugar_inexistente_lanzaNoEncontrado() {
        when(repository.existsById(99L)).thenReturn(false);

        assertThrows(RecursoNoEncontradoException.class, () -> service.eliminarLugar(99L));
        verify(repository, never()).deleteById(any());
    }
}