package com.faro.backend.services;

import com.faro.backend.dto.DesvioOrdenDTO;
import com.faro.backend.dto.ResumenDesviosDTO;
import com.faro.backend.models.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("Lógica de cálculo de desvíos (planificado vs ejecutado)")
class CalculoDesvioServiceTest {

    private CalculoDesvioService service;
    private PuntoInfraestructura lugar;
    private ReglaMantenimiento regla;
    private EstadoOrden estadoPendiente;
    private EstadoOrden estadoFinalizada;
    private EstadoOrden estadoCancelada;

    @BeforeEach
    void setUp() {
        service = new CalculoDesvioService();

        lugar = new PuntoInfraestructura();
        lugar.setId(10L);
        lugar.setNombre("Plaza San Martín");
        lugar.setTipo("ESPACIO_VERDE");

        regla = new ReglaMantenimiento();
        regla.setId(1L);
        regla.setTitulo("Corte de pasto quincenal");
        regla.setLugar(lugar);

        estadoPendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
        estadoPendiente.setId(1L);

        estadoFinalizada = new EstadoOrden("Finalizada", "#22633E", false, true, 4);
        estadoFinalizada.setId(4L);

        estadoCancelada = new EstadoOrden("Cancelada", "#A52A27", false, true, 5);
        estadoCancelada.setId(5L);
    }

    private OrdenTrabajo crearOrden(LocalDate fechaPlanificada, EstadoOrden estado, LocalDateTime fechaFinalizacion) {
        OrdenTrabajo ot = new OrdenTrabajo();
        ot.setId(100L);
        ot.setDescripcion("Corte de pasto");
        ot.setTipo(TipoTrabajo.CORTE_DE_PASTO);
        ot.setOrigen(OrigenOrden.PLAN_MANTENIMIENTO);
        ot.setPrioridad(PrioridadOrden.MEDIA);
        ot.setLugar(lugar);
        ot.setReglaMantenimiento(regla);
        ot.setFechaPlanificada(fechaPlanificada);
        ot.setEstado(estado);
        ot.setFechaFinalizacion(fechaFinalizacion);
        ot.setFechaCreacion(fechaPlanificada.atStartOfDay());
        return ot;
    }

    @Test
    @DisplayName("OT finalizada exactamente el día planificado se clasifica como A_TIEMPO con desvío 0")
    void otFinalizadaATiempo() {
        LocalDate plan = LocalDate.of(2026, 10, 10);
        LocalDateTime fin = LocalDateTime.of(2026, 10, 10, 14, 0);
        OrdenTrabajo ot = crearOrden(plan, estadoFinalizada, fin);

        DesvioOrdenDTO desvio = service.evaluarOrden(ot, LocalDate.of(2026, 10, 15));

        assertEquals(ClasificacionDesvio.A_TIEMPO, desvio.clasificacionDesvio());
        assertEquals(0, desvio.diasDesvio());
        assertEquals(LocalDate.of(2026, 10, 10), desvio.fechaEjecucion());
    }

    @Test
    @DisplayName("OT finalizada antes de la fecha planificada se clasifica como ADELANTADA con desvío negativo")
    void otFinalizadaAdelantada() {
        LocalDate plan = LocalDate.of(2026, 10, 10);
        LocalDateTime fin = LocalDateTime.of(2026, 10, 8, 11, 0); // 2 días antes
        OrdenTrabajo ot = crearOrden(plan, estadoFinalizada, fin);

        DesvioOrdenDTO desvio = service.evaluarOrden(ot, LocalDate.of(2026, 10, 15));

        assertEquals(ClasificacionDesvio.ADELANTADA, desvio.clasificacionDesvio());
        assertEquals(-2, desvio.diasDesvio());
        assertEquals(LocalDate.of(2026, 10, 8), desvio.fechaEjecucion());
    }

    @Test
    @DisplayName("OT finalizada después de la fecha planificada se clasifica como DEMORADA con desvío positivo")
    void otFinalizadaDemorada() {
        LocalDate plan = LocalDate.of(2026, 10, 10);
        LocalDateTime fin = LocalDateTime.of(2026, 10, 14, 16, 30); // 4 días después
        OrdenTrabajo ot = crearOrden(plan, estadoFinalizada, fin);

        DesvioOrdenDTO desvio = service.evaluarOrden(ot, LocalDate.of(2026, 10, 20));

        assertEquals(ClasificacionDesvio.DEMORADA, desvio.clasificacionDesvio());
        assertEquals(4, desvio.diasDesvio());
        assertEquals(LocalDate.of(2026, 10, 14), desvio.fechaEjecucion());
    }

    @Test
    @DisplayName("OT pendiente con fecha planificada no vencida se clasifica como PENDIENTE_EN_PLAZO")
    void otPendienteEnPlazo() {
        LocalDate plan = LocalDate.of(2026, 10, 25);
        LocalDate hoy = LocalDate.of(2026, 10, 20); // 5 días antes de la fecha límite
        OrdenTrabajo ot = crearOrden(plan, estadoPendiente, null);

        DesvioOrdenDTO desvio = service.evaluarOrden(ot, hoy);

        assertEquals(ClasificacionDesvio.PENDIENTE_EN_PLAZO, desvio.clasificacionDesvio());
        assertEquals(-5, desvio.diasDesvio());
        assertNull(desvio.fechaEjecucion());
    }

    @Test
    @DisplayName("OT pendiente con fecha planificada vencida se clasifica como PENDIENTE_VENCIDA con días de mora")
    void otPendienteVencida() {
        LocalDate plan = LocalDate.of(2026, 10, 10);
        LocalDate hoy = LocalDate.of(2026, 10, 17); // 7 días vencida
        OrdenTrabajo ot = crearOrden(plan, estadoPendiente, null);

        DesvioOrdenDTO desvio = service.evaluarOrden(ot, hoy);

        assertEquals(ClasificacionDesvio.PENDIENTE_VENCIDA, desvio.clasificacionDesvio());
        assertEquals(7, desvio.diasDesvio());
        assertNull(desvio.fechaEjecucion());
    }

    @Test
    @DisplayName("OT cancelada se clasifica como CANCELADA con desvío 0")
    void otCancelada() {
        LocalDate plan = LocalDate.of(2026, 10, 10);
        OrdenTrabajo ot = crearOrden(plan, estadoCancelada, null);

        DesvioOrdenDTO desvio = service.evaluarOrden(ot, LocalDate.of(2026, 10, 20));

        assertEquals(ClasificacionDesvio.CANCELADA, desvio.clasificacionDesvio());
        assertEquals(0, desvio.diasDesvio());
    }

    @Test
    @DisplayName("Resumen consolidado calcula correctamente métricas, porcentajes de cumplimiento y promedio de desvío")
    void calcularResumenConsolidado() {
        LocalDate plan = LocalDate.of(2026, 10, 10);

        // 1 a tiempo (0 días)
        OrdenTrabajo ot1 = crearOrden(plan, estadoFinalizada, plan.atTime(10, 0));
        // 1 adelantada 1 día (-1 días)
        OrdenTrabajo ot2 = crearOrden(plan, estadoFinalizada, plan.minusDays(1).atTime(10, 0));
        // 1 demorada 4 días (+4 días)
        OrdenTrabajo ot3 = crearOrden(plan, estadoFinalizada, plan.plusDays(4).atTime(10, 0));
        // 1 pendiente vencida por 3 días
        OrdenTrabajo ot4 = crearOrden(plan, estadoPendiente, null);
        // 1 cancelada
        OrdenTrabajo ot5 = crearOrden(plan, estadoCancelada, null);

        LocalDate hoy = LocalDate.of(2026, 10, 13);
        List<OrdenTrabajo> ordenes = List.of(ot1, ot2, ot3, ot4, ot5);

        ResumenDesviosDTO resumen = service.calcularResumen(regla.getId(), regla.getTitulo(), ordenes, hoy);

        assertEquals(5, resumen.totalGeneradas());
        assertEquals(1, resumen.finalizadasATiempo());
        assertEquals(1, resumen.finalizadasAdelantadas());
        assertEquals(1, resumen.finalizadasDemoradas());
        assertEquals(0, resumen.pendientesEnPlazo());
        assertEquals(1, resumen.pendientesVencidas());
        assertEquals(1, resumen.canceladas());

        // totalFinalizadas = 3 (ot1 + ot2 + ot3). Finalizadas a tiempo o adelantadas = 2.
        // cumplimiento = (2 / 3) * 100 = 66.67%
        assertEquals(66.67, resumen.porcentajeCumplimiento());

        // desvío de finalizadas = (0 + (-1) + 4) / 3 = 3 / 3 = 1.0 días
        assertEquals(1.0, resumen.desvioPromedioDias());
    }
}
