package com.faro.backend.services;

import com.faro.backend.dto.ReglaMantenimientoDTO;
import com.faro.backend.dto.ReglaMantenimientoRequestDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.CuadrillaRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import com.faro.backend.repositories.ReglaMantenimientoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Reglas de Mantenimiento Service")
class ReglaMantenimientoServiceTest {

    @Mock
    private ReglaMantenimientoRepository reglaRepository;

    @Mock
    private PuntoInfraestructuraRepository lugarRepository;

    @Mock
    private CuadrillaRepository cuadrillaRepository;

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Spy
    private CalculadorRecurrencia calculadorRecurrencia;

    @InjectMocks
    private ReglaMantenimientoService service;

    private PuntoInfraestructura plaza;
    private Cuadrilla cuadrillaEspaciosVerdes;

    @BeforeEach
    void setUp() {
        plaza = new PuntoInfraestructura();
        plaza.setId(10L);
        plaza.setNombre("Plaza San Martín");

        cuadrillaEspaciosVerdes = new Cuadrilla("Espacios Verdes", 4, true, Set.of(TipoTrabajo.CORTE_DE_PASTO, TipoTrabajo.PODA));
        cuadrillaEspaciosVerdes.setId(20L);
    }

    private ReglaMantenimientoRequestDTO pedidoValido(LocalDate inicio, LocalDate fin) {
        return new ReglaMantenimientoRequestDTO(
                "Corte de pasto semanal",
                "Cortar pasto y bordear canteros",
                TipoTrabajo.CORTE_DE_PASTO,
                PrioridadOrden.MEDIA,
                10L,
                20L,
                TipoFrecuencia.SEMANAL,
                1,
                1, // Lunes
                null,
                inicio,
                fin,
                true
        );
    }

    private ReglaMantenimiento reglaBase(Long id) {
        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setId(id);
        regla.setTitulo("Regla existente");
        regla.setDescripcion("Descripción existente");
        regla.setTipoTrabajo(TipoTrabajo.CORTE_DE_PASTO);
        regla.setPrioridad(PrioridadOrden.MEDIA);
        regla.setLugar(plaza);
        regla.setFrecuencia(TipoFrecuencia.DIARIA);
        regla.setFechaInicio(LocalDate.of(2026, 1, 1));
        regla.setProximaEjecucion(LocalDate.of(2026, 1, 10));
        return regla;
    }

    @Test
    @DisplayName("Listar devuelve las reglas aplicando los dos filtros solicitados")
    void listarConFiltros() {
        ReglaMantenimiento regla = reglaBase(3L);
        when(reglaRepository.findByLugarIdAndActiva(10L, true)).thenReturn(java.util.List.of(regla));

        var resultado = service.listar(true, 10L);

        assertEquals(1, resultado.size());
        assertEquals("Regla existente", resultado.get(0).titulo());
        verify(reglaRepository).findByLugarIdAndActiva(10L, true);
    }

    @Test
    @DisplayName("Obtener una regla inexistente devuelve error de recurso no encontrado")
    void obtenerReglaInexistente() {
        when(reglaRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> service.obtener(404L));
    }

    @Test
    @DisplayName("Modificar recalcula la próxima fecha si cambia el inicio y conserva activa si no se envía")
    void modificarRecalculaFechaYConservaEstado() {
        ReglaMantenimiento regla = reglaBase(4L);
        regla.setActiva(false);
        LocalDate nuevoInicio = LocalDate.of(2026, 11, 2);
        ReglaMantenimientoRequestDTO request = new ReglaMantenimientoRequestDTO(
                "  Corte semanal  ", "  Nueva descripción  ", TipoTrabajo.CORTE_DE_PASTO,
                PrioridadOrden.ALTA, 10L, null, TipoFrecuencia.SEMANAL, null,
                1, null, nuevoInicio, null, null);
        when(reglaRepository.findById(4L)).thenReturn(Optional.of(regla));
        when(lugarRepository.findById(10L)).thenReturn(Optional.of(plaza));
        when(reglaRepository.save(any(ReglaMantenimiento.class))).thenAnswer(inv -> inv.getArgument(0));

        ReglaMantenimientoDTO modificada = service.modificar(4L, request);

        assertEquals("Corte semanal", modificada.titulo());
        assertEquals("Nueva descripción", modificada.descripcion());
        assertEquals(1, modificada.intervalo());
        assertEquals(nuevoInicio, modificada.proximaEjecucion());
        assertFalse(modificada.activa());
    }

    @Test
    @DisplayName("Activar conserva la próxima fecha si todavía no venció")
    void activarReglaVigente() {
        ReglaMantenimiento regla = reglaBase(6L);
        regla.setFechaInicio(LocalDate.now());
        regla.setProximaEjecucion(LocalDate.now().plusDays(2));
        regla.setActiva(false);
        when(reglaRepository.findById(6L)).thenReturn(Optional.of(regla));
        when(reglaRepository.save(any(ReglaMantenimiento.class))).thenAnswer(inv -> inv.getArgument(0));

        ReglaMantenimientoDTO resultado = service.activar(6L);

        assertTrue(resultado.activa());
        assertEquals(LocalDate.now().plusDays(2), resultado.proximaEjecucion());
    }

    @Test
    @DisplayName("Crear regla válida guarda y calcula la próxima ejecución inicial")
    void crearReglaValida() {
        LocalDate inicio = LocalDate.of(2026, 11, 2); // Lunes
        ReglaMantenimientoRequestDTO request = pedidoValido(inicio, null);

        when(lugarRepository.findById(10L)).thenReturn(Optional.of(plaza));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(cuadrillaEspaciosVerdes));
        when(reglaRepository.save(any(ReglaMantenimiento.class))).thenAnswer(inv -> {
            ReglaMantenimiento r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        ReglaMantenimientoDTO creada = service.crear(request);

        assertNotNull(creada);
        assertEquals(1L, creada.id());
        assertEquals("Corte de pasto semanal", creada.titulo());
        assertEquals(inicio, creada.proximaEjecucion());
        assertTrue(creada.activa());
        verify(reglaRepository).save(any(ReglaMantenimiento.class));
    }

    @Test
    @DisplayName("Crear regla falla con 404 si el lugar no existe")
    void crearReglaLugarInexistente() {
        ReglaMantenimientoRequestDTO request = pedidoValido(LocalDate.now(), null);
        when(lugarRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> service.crear(request));
        verify(reglaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Crear regla falla con 409 si la cuadrilla no está disponible")
    void crearReglaCuadrillaNoDisponible() {
        cuadrillaEspaciosVerdes.setDisponible(false);
        ReglaMantenimientoRequestDTO request = pedidoValido(LocalDate.now(), null);

        when(lugarRepository.findById(10L)).thenReturn(Optional.of(plaza));
        when(cuadrillaRepository.findById(20L)).thenReturn(Optional.of(cuadrillaEspaciosVerdes));

        assertThrows(OperacionNoPermitidaException.class, () -> service.crear(request));
        verify(reglaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Crear regla falla con 409 si la cuadrilla no realiza el tipo de trabajo")
    void crearReglaCuadrillaNoRealizaTipoTrabajo() {
        Cuadrilla cuadrillaAlumbrado = new Cuadrilla("Alumbrado", 3, true, Set.of(TipoTrabajo.ALUMBRADO));
        cuadrillaAlumbrado.setId(21L);

        ReglaMantenimientoRequestDTO request = new ReglaMantenimientoRequestDTO(
                "Corte de pasto",
                "Descripción",
                TipoTrabajo.CORTE_DE_PASTO,
                PrioridadOrden.MEDIA,
                10L,
                21L,
                TipoFrecuencia.DIARIA,
                1,
                null,
                null,
                LocalDate.now(),
                null,
                true
        );

        when(lugarRepository.findById(10L)).thenReturn(Optional.of(plaza));
        when(cuadrillaRepository.findById(21L)).thenReturn(Optional.of(cuadrillaAlumbrado));

        assertThrows(OperacionNoPermitidaException.class, () -> service.crear(request));
    }

    @Test
    @DisplayName("Crear regla falla con 409 si fechaFin es anterior a fechaInicio")
    void crearReglaFechaFinAnteriorAInicio() {
        LocalDate inicio = LocalDate.of(2026, 11, 10);
        LocalDate fin = LocalDate.of(2026, 11, 5);
        ReglaMantenimientoRequestDTO request = pedidoValido(inicio, fin);

        assertThrows(OperacionNoPermitidaException.class, () -> service.crear(request));
    }

    @Test
    @DisplayName("Pausar regla desactiva la regla")
    void pausarRegla() {
        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setId(5L);
        regla.setTitulo("Regla");
        regla.setLugar(plaza);
        regla.setActiva(true);

        when(reglaRepository.findById(5L)).thenReturn(Optional.of(regla));
        when(reglaRepository.save(any(ReglaMantenimiento.class))).thenAnswer(inv -> inv.getArgument(0));

        ReglaMantenimientoDTO resultado = service.pausar(5L);

        assertFalse(resultado.activa());
        verify(reglaRepository).save(regla);
    }

    @Test
    @DisplayName("Activar regla activa la regla y recalcula próxima ejecución si venció")
    void activarReglaVencida() {
        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setId(5L);
        regla.setTitulo("Regla");
        regla.setLugar(plaza);
        regla.setFrecuencia(TipoFrecuencia.DIARIA);
        regla.setIntervalo(1);
        regla.setFechaInicio(LocalDate.now().minusDays(10));
        regla.setProximaEjecucion(LocalDate.now().minusDays(5));
        regla.setActiva(false);

        when(reglaRepository.findById(5L)).thenReturn(Optional.of(regla));
        when(reglaRepository.save(any(ReglaMantenimiento.class))).thenAnswer(inv -> inv.getArgument(0));

        ReglaMantenimientoDTO resultado = service.activar(5L);

        assertTrue(resultado.activa());
        assertFalse(resultado.proximaEjecucion().isBefore(LocalDate.now()));
        verify(reglaRepository).save(regla);
    }

    @Test
    @DisplayName("Eliminar regla falla con 409 si ya tiene OT generadas")
    void eliminarReglaConOrdenesFalla() {
        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setId(8L);

        when(reglaRepository.findById(8L)).thenReturn(Optional.of(regla));
        when(ordenRepository.existsByReglaMantenimientoId(8L)).thenReturn(true);

        assertThrows(OperacionNoPermitidaException.class, () -> service.eliminar(8L));
        verify(reglaRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Eliminar regla sin OT generadas la borra correctamente")
    void eliminarReglaSinOrdenesBorra() {
        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setId(8L);

        when(reglaRepository.findById(8L)).thenReturn(Optional.of(regla));
        when(ordenRepository.existsByReglaMantenimientoId(8L)).thenReturn(false);

        service.eliminar(8L);
        verify(reglaRepository).delete(regla);
    }
}
