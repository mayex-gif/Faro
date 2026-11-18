package com.faro.backend.services;

import com.faro.backend.dto.CambioEstadoRequestDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static com.faro.backend.config.security.UsuariosDePrueba.encargado;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests del pop-up de "Finalizar": la casilla "El lugar quedó funcionando" (todos los tipos de lugar)
 * y "¿Cuánto se gastó en total?" (gasto real, con la compatibilidad del gasto adicional viejo de #74).
 * Todos los repositories son mocks: no se usa la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServiceFinalizacionTest {

    @Mock private OrdenTrabajoRepository ordenRepository;
    @Mock private PuntoInfraestructuraRepository lugarRepository;
    @Mock private EstadoOrdenRepository estadoRepository;
    @Mock private TransicionEstadoRepository transicionRepository;
    @Mock private CuadrillaRepository cuadrillaRepository;
    @Mock private EventoOrdenRepository eventoRepository;

    @InjectMocks
    private OrdenTrabajoService service;

    private static final Usuario ENCARGADO = encargado().getUsuario();

    private static EstadoOrden estado(Long id, String nombre, boolean cierre) {
        EstadoOrden estado = new EstadoOrden(nombre, "#000000", false, cierre, id.intValue());
        estado.setId(id);
        return estado;
    }

    private final EstadoOrden enCurso = estado(3L, "En curso", false);
    private final EstadoOrden finalizada = estado(4L, "Finalizada", true);
    private final EstadoOrden cancelada = estado(5L, "Cancelada", true);

    /** Una OT "En curso" sobre un lugar de ese tipo, que funciona o no. */
    private OrdenTrabajo ordenEnCurso(String tipoDeLugar, boolean funciona) {
        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setId(3L);
        lugar.setNombre("Lugar de prueba");
        lugar.setTipo(tipoDeLugar);
        lugar.setEstadoOperativo(funciona);
        lugar.setInstalada(true);

        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(7L);
        orden.setDescripcion("Arreglar");
        orden.setTipo(TipoTrabajo.PODA);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setLugar(lugar);
        orden.setEstado(enCurso);
        return orden;
    }

    private OrdenTrabajoDTO pasarA(OrdenTrabajo orden, EstadoOrden destino, Boolean lugarFunciona, BigDecimal gastoReal) {
        return pasarA(orden, new CambioEstadoRequestDTO(destino.getId(), lugarFunciona, gastoReal), destino);
    }

    private OrdenTrabajoDTO pasarA(OrdenTrabajo orden, CambioEstadoRequestDTO pedido, EstadoOrden destino) {
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(orden));
        when(estadoRepository.findById(destino.getId())).thenReturn(Optional.of(destino));
        when(transicionRepository.existsByOrigenIdAndDestinoId(3L, destino.getId())).thenReturn(true);
        lenient().when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        return service.cambiarEstado(7L, pedido, ENCARGADO);
    }

    /** Lo que mandan las pantallas y comandas viejas (pop-up de #74): solo el gasto adicional. */
    private OrdenTrabajoDTO finalizarConGastoAdicional(OrdenTrabajo orden, BigDecimal gastoAdicional) {
        return pasarA(orden, new CambioEstadoRequestDTO(finalizada.getId(), null, null, gastoAdicional), finalizada);
    }

    /** El renglón que quedó en la bitácora. */
    private EventoOrden eventoAnotado() {
        ArgumentCaptor<EventoOrden> evento = ArgumentCaptor.forClass(EventoOrden.class);
        verify(eventoRepository).save(evento.capture());
        return evento.getValue();
    }

    // ===================== La casilla "El lugar quedó funcionando" =====================

    @Test
    void conLaCasillaMarcada_unaCalleFueraDeServicioVuelveAFuncionar() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", false);

        pasarA(orden, finalizada, true, null);

        assertTrue(orden.getLugar().getEstadoOperativo());
        assertEquals(Boolean.TRUE, eventoAnotado().getLugarFunciona()); // en la ficha: "volvió a funcionar"
    }

    @Test
    void conLaCasillaMarcada_unLugarFueraDeServicioVuelveAFuncionar() {
        OrdenTrabajo orden = ordenEnCurso("ESPACIO_VERDE", false);

        pasarA(orden, finalizada, true, null);

        assertTrue(orden.getLugar().getEstadoOperativo());
    }

    @Test
    void conLaCasillaDesmarcada_unaLuminariaApagadaSigueApagada() {
        // Antes volvía sola a "Funciona": ahora manda la casilla (ej: tiene otro trabajo abierto)
        OrdenTrabajo orden = ordenEnCurso("LUMINARIA", false);

        pasarA(orden, finalizada, false, null);

        assertFalse(orden.getLugar().getEstadoOperativo());
        assertEquals(Boolean.FALSE, eventoAnotado().getLugarFunciona()); // en la ficha: "sigue fuera de servicio"
    }

    @Test
    void sinLaCasilla_unaLuminariaApagadaVuelveSolaAFuncionarComoAntes() {
        // Pantallas viejas o comandas sin señal de antes del pop-up: no mandan la casilla
        OrdenTrabajo orden = ordenEnCurso("LUMINARIA", false);

        pasarA(orden, finalizada, null, null);

        assertTrue(orden.getLugar().getEstadoOperativo());
        assertEquals(Boolean.TRUE, eventoAnotado().getLugarFunciona());
    }

    @Test
    void sinLaCasilla_unaCalleFueraDeServicioQuedaComoEstaba() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", false);

        pasarA(orden, finalizada, null, null);

        assertFalse(orden.getLugar().getEstadoOperativo());
    }

    @Test
    void conLaCasillaMarcada_unaLuminariaAFuturoNoSeToca() {
        OrdenTrabajo orden = ordenEnCurso("LUMINARIA", false);
        orden.getLugar().setInstalada(false);

        pasarA(orden, finalizada, true, null);

        assertFalse(orden.getLugar().getEstadoOperativo());
        assertFalse(orden.getLugar().getInstalada());
    }

    @Test
    void siElLugarYaFuncionaba_laFichaNoDiceNadaDelLugar() {
        OrdenTrabajo orden = ordenEnCurso("ESPACIO_VERDE", true);

        pasarA(orden, finalizada, null, null);

        assertTrue(orden.getLugar().getEstadoOperativo());
        assertNull(eventoAnotado().getLugarFunciona());
    }

    // ===================== "¿Cuánto se gastó en total?" (gasto real) =====================

    @Test
    void elGastoRealSeGuardaEnLaOtYEnLaBitacora() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", true);
        orden.setMontoAproximado(new BigDecimal("20000"));

        // Se declararon $ 20.000 y se gastaron $ 15.000: se puede registrar que se gastó MENOS
        OrdenTrabajoDTO resultado = pasarA(orden, finalizada, null, new BigDecimal("15000.50"));

        assertEquals(new BigDecimal("15000.50"), orden.getGastoReal());
        assertEquals(new BigDecimal("15000.50"), resultado.gastoReal());
        assertEquals(new BigDecimal("20000"), orden.getMontoAproximado()); // lo declarado no se toca
        EventoOrden evento = eventoAnotado();
        assertEquals(new BigDecimal("15000.50"), evento.getGastoReal());
        assertEquals("Finalizada", evento.getEstadoNuevo().getNombre());
    }

    @Test
    void unGastoRealDeCeroSeGuarda() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", true);
        orden.setMontoAproximado(new BigDecimal("5000"));

        pasarA(orden, finalizada, null, BigDecimal.ZERO);

        assertEquals(BigDecimal.ZERO, orden.getGastoReal());
    }

    @Test
    void sinGasto_laOtQuedaSinGastoReal() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", true);

        OrdenTrabajoDTO resultado = pasarA(orden, finalizada, null, null);

        assertNull(orden.getGastoReal());
        assertNull(resultado.gastoReal());
        assertNull(eventoAnotado().getGastoReal());
    }

    @Test
    void sinGasto_noBorraUnGastoQueYaTenia() {
        // Ej: una OT reabierta que se vuelve a finalizar desde una pantalla sin el campo
        OrdenTrabajo orden = ordenEnCurso("CALLE", true);
        orden.setGastoReal(new BigDecimal("500"));

        pasarA(orden, finalizada, null, null);

        assertEquals(new BigDecimal("500"), orden.getGastoReal());
    }

    // ===================== Compatibilidad: el gasto adicional viejo (#74) =====================

    @Test
    void conElGastoAdicionalViejo_elGastoRealEsLoDeclaradoMasElAdicional() {
        // Una pantalla guardada en el celular (o una comanda del cuaderno) del pop-up de #74
        OrdenTrabajo orden = ordenEnCurso("CALLE", true);
        orden.setMontoAproximado(new BigDecimal("20000"));

        OrdenTrabajoDTO resultado = finalizarConGastoAdicional(orden, new BigDecimal("3000"));

        assertEquals(new BigDecimal("23000"), orden.getGastoReal());
        assertEquals(new BigDecimal("23000"), resultado.gastoReal());
        assertEquals(new BigDecimal("23000"), eventoAnotado().getGastoReal());
    }

    @Test
    void conElGastoAdicionalViejoYSinMontoDeclarado_elGastoRealEsElAdicional() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", true);

        finalizarConGastoAdicional(orden, new BigDecimal("8000.50"));

        assertEquals(new BigDecimal("8000.50"), orden.getGastoReal());
    }

    @Test
    void siVienenLosDos_ganaElGastoReal() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", true);
        orden.setMontoAproximado(new BigDecimal("20000"));

        pasarA(orden, new CambioEstadoRequestDTO(4L, null, new BigDecimal("15000"), new BigDecimal("3000")), finalizada);

        assertEquals(new BigDecimal("15000"), orden.getGastoReal());
    }

    // ===================== Fuera del cierre, esos datos no van =====================

    @Test
    void alCancelar_unGastoRealSeRechazaYNoSeGuardaNada() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", false);

        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> pasarA(orden, cancelada, null, new BigDecimal("100")));

        assertEquals("gastoReal", error.getCampo());
        assertSame(enCurso, orden.getEstado());
        verify(ordenRepository, never()).save(any());
        verify(eventoRepository, never()).save(any());
    }

    @Test
    void alCancelar_unGastoAdicionalViejoSeRechazaYNoSeGuardaNada() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", false);

        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> pasarA(orden, new CambioEstadoRequestDTO(5L, null, null, new BigDecimal("100")), cancelada));

        assertEquals("gastoAdicional", error.getCampo());
        assertSame(enCurso, orden.getEstado());
        verify(ordenRepository, never()).save(any());
        verify(eventoRepository, never()).save(any());
    }

    @Test
    void alCancelar_laCasillaSeRechazaYElLugarQuedaComoEstaba() {
        OrdenTrabajo orden = ordenEnCurso("CALLE", false);

        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> pasarA(orden, cancelada, true, null));

        assertEquals("lugarFunciona", error.getCampo());
        assertFalse(orden.getLugar().getEstadoOperativo());
    }

    @Test
    void alCancelarSinEsosDatos_elLugarQuedaComoEstabaYLaFichaNoDiceNada() {
        OrdenTrabajo orden = ordenEnCurso("LUMINARIA", false);

        pasarA(orden, cancelada, null, null);

        assertFalse(orden.getLugar().getEstadoOperativo());
        EventoOrden evento = eventoAnotado();
        assertNull(evento.getLugarFunciona());
        assertNull(evento.getGastoReal());
    }
}
