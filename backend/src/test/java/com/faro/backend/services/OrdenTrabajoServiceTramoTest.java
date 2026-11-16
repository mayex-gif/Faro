package com.faro.backend.services;

import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.dto.OrdenTrabajoRequestDTO;
import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.OrigenOrden;
import com.faro.backend.models.PrioridadOrden;
import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests del tramo de calle dentro del OrdenTrabajoService (alta y modificación).
 * Los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServiceTramoTest {

    @Mock private OrdenTrabajoRepository ordenRepository;
    @Mock private PuntoInfraestructuraRepository lugarRepository;
    @Mock private EstadoOrdenRepository estadoRepository;
    @Mock private TransicionEstadoRepository transicionRepository;
    @Mock private CuadrillaRepository cuadrillaRepository;
    @Mock private EventoOrdenRepository eventoRepository;

    @InjectMocks
    private OrdenTrabajoService service;

    private static final GeometryFactory GPS = new GeometryFactory();

    // ===================== Ayudantes =====================

    private static LineString linea(double long1, double lat1, double long2, double lat2) {
        return GPS.createLineString(new Coordinate[]{new Coordinate(long1, lat1), new Coordinate(long2, lat2)});
    }

    // Calle recta de oeste a este (~380 m) y un tramo de ~140 m sobre ella
    private static final LineString CALLE = linea(-64.1420, -31.1340, -64.1380, -31.1340);
    private static final LineString TRAMO = linea(-64.1410, -31.1340, -64.1397, -31.1340);

    private PuntoInfraestructura lugar(Long id, String nombre, String tipo) {
        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setId(id);
        lugar.setNombre(nombre);
        lugar.setTipo(tipo);
        lugar.setUbicacion(CALLE);
        return lugar;
    }

    private OrdenTrabajoRequestDTO pedido(Long lugarId, String entre1, String entre2, String altura,
                                          org.locationtech.jts.geom.Geometry tramo) {
        return new OrdenTrabajoRequestDTO("Bachear", TipoTrabajo.BACHEO, OrigenOrden.RECLAMO_VECINAL,
                PrioridadOrden.ALTA, lugarId, entre1, entre2, altura, null, tramo);
    }

    private void prepararAlta(PuntoInfraestructura lugar) {
        when(lugarRepository.findById(lugar.getId())).thenReturn(Optional.of(lugar));
        EstadoOrden pendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
        pendiente.setId(1L);
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.of(pendiente));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> {
            OrdenTrabajo guardada = invocacion.getArgument(0);
            guardada.setId(10L);
            return guardada;
        });
    }

    private OrdenTrabajo ordenExistente(PuntoInfraestructura lugar) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(7L);
        orden.setDescripcion("Bachear");
        orden.setTipo(TipoTrabajo.BACHEO);
        orden.setOrigen(OrigenOrden.RECLAMO_VECINAL);
        orden.setPrioridad(PrioridadOrden.ALTA);
        orden.setLugar(lugar);
        orden.setTramo(TRAMO);
        orden.setCalleEntre1("Catamarca");
        orden.setCalleEntre2("La Rioja");
        orden.setFechaCreacion(LocalDateTime.of(2026, 11, 11, 10, 0));
        return orden;
    }

    // ===================== ALTA =====================

    @Test
    @DisplayName("Alta en una calle con tramo y entre calles: guarda y devuelve el tramo")
    void crear_conTramo_loGuardaYLoDevuelve() {
        prepararAlta(lugar(5L, "Buenos Aires", "CALLE"));

        OrdenTrabajoDTO resultado = service.crear(pedido(5L, "Catamarca", "La Rioja", null, TRAMO));

        assertEquals(TRAMO, resultado.tramo());
        assertEquals(4326, resultado.tramo().getSRID());
        assertEquals("Catamarca", resultado.calleEntre1());
        assertEquals("La Rioja", resultado.calleEntre2());
    }

    @Test
    @DisplayName("Alta en una calle sin tramo: es de toda la calle (tramo null)")
    void crear_sinTramo_esDeTodaLaCalle() {
        prepararAlta(lugar(5L, "Buenos Aires", "CALLE"));

        OrdenTrabajoDTO resultado = service.crear(pedido(5L, null, null, null, null));

        assertNull(resultado.tramo());
    }

    @Test
    @DisplayName("Alta con tramo desde la mitad de la cuadra, sin entre calles: se acepta")
    void crear_conTramoSinEntreCalles_seAcepta() {
        prepararAlta(lugar(5L, "Buenos Aires", "CALLE"));

        assertEquals(TRAMO, service.crear(pedido(5L, null, null, null, TRAMO)).tramo());
    }

    @Test
    @DisplayName("Alta por altura con tramo: 400 en el campo tramo y no guarda")
    void crear_porAlturaConTramo_lanzaErrorYNoGuarda() {
        when(lugarRepository.findById(5L)).thenReturn(Optional.of(lugar(5L, "Buenos Aires", "CALLE")));

        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> service.crear(pedido(5L, null, null, "350", TRAMO)));

        assertEquals("tramo", error.getCampo());
        assertEquals("Una OT por altura no lleva tramo marcado", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Alta con un tramo fuera de la calle: 400 y no guarda")
    void crear_conTramoFueraDeLaCalle_lanzaErrorYNoGuarda() {
        when(lugarRepository.findById(5L)).thenReturn(Optional.of(lugar(5L, "Buenos Aires", "CALLE")));

        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> service.crear(pedido(5L, null, null, null, linea(-64.1410, -31.1350, -64.1397, -31.1350))));

        assertEquals("tramo", error.getCampo());
        verify(ordenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Alta con tramo en un lugar que no es calle: 400 y no guarda")
    void crear_conTramoEnUnLugar_lanzaErrorYNoGuarda() {
        when(lugarRepository.findById(3L)).thenReturn(Optional.of(lugar(3L, "Plaza San Martín", "ESPACIO_VERDE")));

        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> service.crear(pedido(3L, null, null, null, TRAMO)));

        assertEquals("El tramo solo se puede marcar en una calle", error.getMessage());
        verify(ordenRepository, never()).save(any());
    }

    // ===================== MODIFICACIÓN =====================

    @Test
    @DisplayName("Modificar sin mandar el tramo lo borra (el PUT reemplaza todo)")
    void modificar_sinTramo_loBorra() {
        PuntoInfraestructura calle = lugar(5L, "Buenos Aires", "CALLE");
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenExistente(calle)));
        when(lugarRepository.findById(5L)).thenReturn(Optional.of(calle));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        OrdenTrabajoDTO resultado = service.modificar(7L, pedido(5L, null, null, null, null));

        assertNull(resultado.tramo());
        assertNull(resultado.calleEntre1());
    }

    @Test
    @DisplayName("Modificar mandando el tramo de nuevo lo conserva")
    void modificar_conElMismoTramo_loConserva() {
        PuntoInfraestructura calle = lugar(5L, "Buenos Aires", "CALLE");
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(ordenExistente(calle)));
        when(lugarRepository.findById(5L)).thenReturn(Optional.of(calle));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        OrdenTrabajoDTO resultado = service.modificar(7L, pedido(5L, "Catamarca", "La Rioja", null, TRAMO));

        assertEquals(TRAMO, resultado.tramo());
    }
}
