package com.faro.backend.services;

import com.faro.backend.dto.GeneracionOrdenesResultadoDTO;
import com.faro.backend.dto.OrdenTrabajoDTO;
import com.faro.backend.exceptions.OperacionNoPermitidaException;
import com.faro.backend.models.*;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.EventoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Motor de Mantenimiento Periódico Service")
class MotorMantenimientoServiceTest {

    @Mock
    private ReglaMantenimientoRepository reglaRepository;

    @Mock
    private OrdenTrabajoRepository ordenRepository;

    @Mock
    private EstadoOrdenRepository estadoRepository;

    @Mock
    private EventoOrdenRepository eventoRepository;

    @Spy
    private CalculadorRecurrencia calculadorRecurrencia;

    @InjectMocks
    private MotorMantenimientoService motorService;

    private PuntoInfraestructura plaza;
    private Cuadrilla cuadrilla;
    private EstadoOrden pendiente;
    private EstadoOrden planificada;
    private ReglaMantenimiento reglaSemanal;

    @BeforeEach
    void setUp() {
        plaza = new PuntoInfraestructura();
        plaza.setId(10L);
        plaza.setNombre("Plaza San Martín");

        cuadrilla = new Cuadrilla("Espacios Verdes", 4, true, Set.of(TipoTrabajo.CORTE_DE_PASTO));
        cuadrilla.setId(20L);

        pendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
        pendiente.setId(1L);

        planificada = new EstadoOrden("Planificada", "#086C80", false, false, 2);
        planificada.setId(2L);

        reglaSemanal = new ReglaMantenimiento();
        reglaSemanal.setId(1L);
        reglaSemanal.setTitulo("Corte de pasto");
        reglaSemanal.setDescripcion("Cortar el pasto del sector juegos");
        reglaSemanal.setTipoTrabajo(TipoTrabajo.CORTE_DE_PASTO);
        reglaSemanal.setPrioridad(PrioridadOrden.MEDIA);
        reglaSemanal.setLugar(plaza);
        reglaSemanal.setCuadrilla(cuadrilla);
        reglaSemanal.setFrecuencia(TipoFrecuencia.SEMANAL);
        reglaSemanal.setIntervalo(1);
        reglaSemanal.setFechaInicio(LocalDate.of(2026, 10, 1));
        reglaSemanal.setProximaEjecucion(LocalDate.of(2026, 10, 8));
        reglaSemanal.setActiva(true);
    }

    @Test
    @DisplayName("Generar órdenes pendientes autogenera OT y asigna cuadrilla si está disponible")
    void generarOrdenesPendientesConCuadrilla() {
        LocalDate hoy = LocalDate.of(2026, 10, 8);

        when(reglaRepository.findByActivaTrueAndProximaEjecucionLessThanEqual(hoy))
                .thenReturn(List.of(reglaSemanal));
        when(ordenRepository.existsByReglaMantenimientoIdAndFechaPlanificada(1L, hoy))
                .thenReturn(false);
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.of(pendiente));
        when(estadoRepository.findByNombreIgnoreCase("Planificada")).thenReturn(Optional.of(planificada));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> {
            OrdenTrabajo ot = inv.getArgument(0);
            ot.setId(101L);
            return ot;
        });

        GeneracionOrdenesResultadoDTO resultado = motorService.generarOrdenesPendientes(hoy);

        assertEquals(1, resultado.reglasEvaluadas());
        assertEquals(1, resultado.ordenesGeneradas());

        OrdenTrabajoDTO otDTO = resultado.ordenes().get(0);
        assertEquals(101L, otDTO.id());
        assertEquals(OrigenOrden.PLAN_MANTENIMIENTO, otDTO.origen());
        assertEquals("Planificada", otDTO.estadoNombre());
        assertEquals(20L, otDTO.cuadrillaId());
        assertEquals(hoy, otDTO.fechaPlanificada());

        // La regla debe haber avanzado su próxima ejecución (+1 semana: 15 de octubre)
        assertEquals(LocalDate.of(2026, 10, 15), reglaSemanal.getProximaEjecucion());
        assertNotNull(reglaSemanal.getUltimaGeneracion());
        verify(eventoRepository).save(any(EventoOrden.class));
        verify(reglaRepository).save(reglaSemanal);
    }

    @Test
    @DisplayName("Generar órdenes para regla sin cuadrilla la deja en estado Pendiente")
    void generarOrdenesPendientesSinCuadrilla() {
        reglaSemanal.setCuadrilla(null);
        LocalDate hoy = LocalDate.of(2026, 10, 8);

        when(reglaRepository.findByActivaTrueAndProximaEjecucionLessThanEqual(hoy))
                .thenReturn(List.of(reglaSemanal));
        when(ordenRepository.existsByReglaMantenimientoIdAndFechaPlanificada(1L, hoy))
                .thenReturn(false);
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.of(pendiente));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> {
            OrdenTrabajo ot = inv.getArgument(0);
            ot.setId(102L);
            return ot;
        });

        GeneracionOrdenesResultadoDTO resultado = motorService.generarOrdenesPendientes(hoy);

        assertEquals(1, resultado.ordenesGeneradas());
        OrdenTrabajoDTO otDTO = resultado.ordenes().get(0);
        assertEquals("Pendiente", otDTO.estadoNombre());
        assertNull(otDTO.cuadrillaId());
    }

    @Test
    @DisplayName("Idempotencia: si ya existe una OT para esa regla y fecha planificada, no genera duplicado")
    void idempotenciaNoGeneraDuplicado() {
        LocalDate hoy = LocalDate.of(2026, 10, 8);

        when(reglaRepository.findByActivaTrueAndProximaEjecucionLessThanEqual(hoy))
                .thenReturn(List.of(reglaSemanal));
        when(ordenRepository.existsByReglaMantenimientoIdAndFechaPlanificada(1L, hoy))
                .thenReturn(true); // Ya existe

        GeneracionOrdenesResultadoDTO resultado = motorService.generarOrdenesPendientes(hoy);

        assertEquals(1, resultado.reglasEvaluadas());
        assertEquals(0, resultado.ordenesGeneradas());
        verify(ordenRepository, never()).save(any());
        // Se avanza la próxima fecha igualmente
        assertEquals(LocalDate.of(2026, 10, 15), reglaSemanal.getProximaEjecucion());
        verify(reglaRepository).save(reglaSemanal);
    }

    @Test
    @DisplayName("Regla con fechaFin expirada se desactiva y no genera OT")
    void reglaConFechaFinExpiradaSeDesactiva() {
        LocalDate hoy = LocalDate.of(2026, 10, 8);
        reglaSemanal.setFechaFin(LocalDate.of(2026, 10, 5)); // Venció el 5 de octubre

        when(reglaRepository.findByActivaTrueAndProximaEjecucionLessThanEqual(hoy))
                .thenReturn(List.of(reglaSemanal));

        GeneracionOrdenesResultadoDTO resultado = motorService.generarOrdenesPendientes(hoy);

        assertEquals(0, resultado.ordenesGeneradas());
        assertFalse(reglaSemanal.isActiva());
        verify(ordenRepository, never()).save(any());
        verify(reglaRepository).save(reglaSemanal);
    }

    @Test
    @DisplayName("Ejecución manual de regla pausada lanza OperacionNoPermitidaException (409)")
    void ejecucionManualReglaPausadaFalla() {
        reglaSemanal.setActiva(false);
        when(reglaRepository.findById(1L)).thenReturn(Optional.of(reglaSemanal));

        assertThrows(OperacionNoPermitidaException.class,
                () -> motorService.ejecutarReglaManualmente(1L, LocalDate.now()));
    }

    @Test
    @DisplayName("Ejecución manual de regla activa genera la OT y avanza la fecha")
    void ejecucionManualReglaActivaGeneraOT() {
        LocalDate hoy = LocalDate.of(2026, 10, 8);
        when(reglaRepository.findById(1L)).thenReturn(Optional.of(reglaSemanal));
        when(ordenRepository.existsByReglaMantenimientoIdAndFechaPlanificada(1L, hoy)).thenReturn(false);
        when(estadoRepository.findFirstByInicialTrue()).thenReturn(Optional.of(pendiente));
        when(estadoRepository.findByNombreIgnoreCase("Planificada")).thenReturn(Optional.of(planificada));
        when(ordenRepository.save(any(OrdenTrabajo.class))).thenAnswer(inv -> {
            OrdenTrabajo ot = inv.getArgument(0);
            ot.setId(105L);
            return ot;
        });

        OrdenTrabajoDTO creada = motorService.ejecutarReglaManualmente(1L, hoy);

        assertNotNull(creada);
        assertEquals(105L, creada.id());
        assertEquals(1L, creada.reglaMantenimientoId());
        assertEquals(LocalDate.of(2026, 10, 15), reglaSemanal.getProximaEjecucion());
    }
}
