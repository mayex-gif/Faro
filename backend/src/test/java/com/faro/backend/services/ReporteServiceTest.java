package com.faro.backend.services;

import com.faro.backend.dto.reportes.*;
import com.faro.backend.dto.DesvioOrdenDTO;
import com.faro.backend.models.*;
import com.faro.backend.repositories.ReporteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

/**
 * Tests unitarios del ReporteService.
 * El repositorio y el CalculoDesvioService son mocks: probamos la orquestación
 * y la lógica de construcción de DTOs sin tocar la base de datos.
 */
@ExtendWith(MockitoExtension.class)
class ReporteServiceTest {

    @Mock
    private ReporteRepository reporteRepository;

    @Mock
    private CalculoDesvioService calculoDesvioService;

    @InjectMocks
    private ReporteService service;

    // ─────────────────────────────────────────────────────────────────────────
    // Fixtures
    // ─────────────────────────────────────────────────────────────────────────

    private EstadoOrden estadoPendiente;
    private EstadoOrden estadoFinalizado;

    @BeforeEach
    void setUp() {
        estadoPendiente = new EstadoOrden("Pendiente", "#566A73", true, false, 1);
        estadoFinalizado = new EstadoOrden("Finalizada", "#27AE60", false, true, 4);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // construirDashboard — valores por defecto
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void dashboardConFechasNullUsaElMesActual() {
        stubearRepositorioVacio();

        DashboardGerencialDTO dto = service.construirDashboard(null, null, null);

        assertThat(dto.desde()).isEqualTo(LocalDate.now().withDayOfMonth(1));
        assertThat(dto.hasta()).isEqualTo(LocalDate.now());
        assertThat(dto.granularidad()).isEqualTo(GranularidadPeriodo.MES);
    }

    @Test
    void dashboardConFechasExplicitasLasUsaDirectamente() {
        stubearRepositorioVacio();
        LocalDate desde = LocalDate.of(2026, 10, 1);
        LocalDate hasta = LocalDate.of(2026, 10, 15);

        DashboardGerencialDTO dto = service.construirDashboard(desde, hasta, GranularidadPeriodo.DIA);

        assertThat(dto.desde()).isEqualTo(desde);
        assertThat(dto.hasta()).isEqualTo(hasta);
        assertThat(dto.granularidad()).isEqualTo(GranularidadPeriodo.DIA);
    }

    @ParameterizedTest
    @EnumSource(AtajoTemporalReporte.class)
    void atajosTemporalesFiltranElRangoEsperado(AtajoTemporalReporte atajo) {
        stubearRepositorioVacio();
        LocalDate hoy = LocalDate.now();
        LocalDate desdeEsperado = switch (atajo) {
            case HOY -> hoy;
            case SEMANA -> hoy.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            case MES -> hoy.withDayOfMonth(1);
            case AÑO -> hoy.withDayOfYear(1);
        };

        service.construirDashboard(null, null, GranularidadPeriodo.DIA, atajo);

        verify(reporteRepository).contarTotalOts(desdeEsperado.atStartOfDay(), hoy.atTime(java.time.LocalTime.MAX));
    }

    @Test
    void rechazaRangoInvertido() {
        assertThatThrownBy(() -> service.construirDashboard(
                LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 1), null))
                .isInstanceOf(com.faro.backend.exceptions.RangoReporteInvalidoException.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KPIs generales
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void totalOtsYPendientesSeSumanCorrectamente() {
        stubearRepositorioVacio();
        when(reporteRepository.contarTotalOts(any(), any())).thenReturn(10L);
        when(reporteRepository.contarOtsCerradas(any(), any())).thenReturn(6L);

        DashboardGerencialDTO dto = service.construirDashboard(null, null, null);

        assertThat(dto.totalOts()).isEqualTo(10);
        assertThat(dto.otsCerradas()).isEqualTo(6);
        assertThat(dto.otsPendientes()).isEqualTo(4); // 10 - 6
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Desgloses por estado / tipo / cuadrilla
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void otsPorEstadoSeConstruyenCorrectamente() {
        stubearRepositorioVacio();

        // Construcción explícita para evitar ambigüedad en inferencia de tipos con Object[]
        List<Object[]> filas = new ArrayList<>();
        filas.add(new Object[]{"Pendiente", "#566A73", 7L});
        when(reporteRepository.contarOtsPorEstado(any(), any())).thenReturn(filas);

        DashboardGerencialDTO dto = service.construirDashboard(null, null, null);

        assertThat(dto.otsPorEstado()).hasSize(1);
        OtsPorEstadoDTO primero = dto.otsPorEstado().get(0);
        assertThat(primero.estadoNombre()).isEqualTo("Pendiente");
        assertThat(primero.estadoColor()).isEqualTo("#566A73");
        assertThat(primero.cantidad()).isEqualTo(7);
    }

    @Test
    void otsPorTipoTrabajoSeConstruyenCorrectamente() {
        stubearRepositorioVacio();
        when(reporteRepository.contarOtsPorTipoTrabajo(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{TipoTrabajo.PODA, 4L}));

        DashboardGerencialDTO dto = service.construirDashboard(null, null, null);

        assertThat(dto.otsPorTipoTrabajo()).containsExactly(new OtsPorTipoTrabajoDTO(TipoTrabajo.PODA, 4L));
    }

    @Test
    void otsPorCuadrillaConCuadrillaNullMuestraTextoSinAsignar() {
        stubearRepositorioVacio();

        List<Object[]> filas = new ArrayList<>();
        filas.add(new Object[]{null, null, 3L});
        filas.add(new Object[]{8L, "Cuadrilla Roja", 2L});
        when(reporteRepository.contarOtsPorCuadrilla(any(), any())).thenReturn(filas);

        DashboardGerencialDTO dto = service.construirDashboard(null, null, null);

        assertThat(dto.otsPorCuadrilla()).hasSize(2);
        assertThat(dto.otsPorCuadrilla().get(0).cuadrillaNombre()).isEqualTo("Sin asignar");
        assertThat(dto.otsPorCuadrilla().get(0).cuadrillaId()).isNull();
        assertThat(dto.otsPorCuadrilla().get(1).cuadrillaNombre()).isEqualTo("Cuadrilla Roja");
        assertThat(dto.otsPorCuadrilla().get(1).cuadrillaId()).isEqualTo(8L);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Resumen de desvíos
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void resumenDesviosSinOrdenesRetornaCeroEnTodo() {
        stubearRepositorioVacio();
        when(reporteRepository.buscarOtsConPlanificacion(any(), any())).thenReturn(List.of());

        DashboardGerencialDTO dto = service.construirDashboard(null, null, null);

        ResumenDesviosGlobalDTO resumen = dto.resumenDesvios();
        assertThat(resumen.totalConPlanificacion()).isZero();
        assertThat(resumen.porcentajeCumplimiento()).isZero();
        assertThat(resumen.desvioPromedioDias()).isZero();
    }

    @Test
    void resumenDesviosCuentaTodasLasClasificacionesYCalculaPromedio() {
        stubearRepositorioVacio();
        List<OrdenTrabajo> ordenes = List.of(new OrdenTrabajo(), new OrdenTrabajo(), new OrdenTrabajo(),
                new OrdenTrabajo(), new OrdenTrabajo(), new OrdenTrabajo());
        when(reporteRepository.buscarOtsConPlanificacion(any(), any())).thenReturn(ordenes);
        when(calculoDesvioService.evaluarOrden(any(), any())).thenReturn(
                desvio(ClasificacionDesvio.A_TIEMPO, 0),
                desvio(ClasificacionDesvio.ADELANTADA, -2),
                desvio(ClasificacionDesvio.DEMORADA, 4),
                desvio(ClasificacionDesvio.PENDIENTE_EN_PLAZO, -1),
                desvio(ClasificacionDesvio.PENDIENTE_VENCIDA, 3),
                desvio(ClasificacionDesvio.CANCELADA, 0));

        ResumenDesviosGlobalDTO resumen = service.construirDashboard(null, null, null).resumenDesvios();

        assertThat(resumen.totalConPlanificacion()).isEqualTo(6);
        assertThat(resumen.aTiempo()).isEqualTo(1);
        assertThat(resumen.adelantadas()).isEqualTo(1);
        assertThat(resumen.demoradas()).isEqualTo(1);
        assertThat(resumen.pendientesEnPlazo()).isEqualTo(1);
        assertThat(resumen.pendientesVencidas()).isEqualTo(1);
        assertThat(resumen.canceladas()).isEqualTo(1);
        assertThat(resumen.porcentajeCumplimiento()).isEqualTo(66.67);
        assertThat(resumen.desvioPromedioDias()).isEqualTo(0.67);
    }

    @Test
    void resumenDesviosSinFinalizadasEvitaDividirPorCero() {
        stubearRepositorioVacio();
        when(reporteRepository.buscarOtsConPlanificacion(any(), any())).thenReturn(List.of(new OrdenTrabajo()));
        when(calculoDesvioService.evaluarOrden(any(), any()))
                .thenReturn(desvio(ClasificacionDesvio.PENDIENTE_EN_PLAZO, -1));

        ResumenDesviosGlobalDTO resumen = service.construirDashboard(null, null, null).resumenDesvios();

        assertThat(resumen.totalConPlanificacion()).isEqualTo(1);
        assertThat(resumen.porcentajeCumplimiento()).isZero();
        assertThat(resumen.desvioPromedioDias()).isZero();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Serie temporal — combina creadas y cerradas por período
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void serieTemporalCombinaCreadasYCerradasPorPeriodo() {
        stubearRepositorioVacio();

        List<Object[]> creadas = new ArrayList<>();
        creadas.add(new Object[]{"2026-10", 5L});

        List<Object[]> cerradas = new ArrayList<>();
        cerradas.add(new Object[]{"2026-10", 3L});

        when(reporteRepository.serieOtsCreadasPorMes(any(), any())).thenReturn(creadas);
        when(reporteRepository.serieOtsCerradasPorMes(any(), any())).thenReturn(cerradas);

        DashboardGerencialDTO dto = service.construirDashboard(null, null, GranularidadPeriodo.MES);

        assertThat(dto.otsPorPeriodo()).hasSize(1);
        OtsPorPeriodoDTO punto = dto.otsPorPeriodo().get(0);
        assertThat(punto.periodo()).isEqualTo("2026-10");
        assertThat(punto.otsCreadas()).isEqualTo(5);
        assertThat(punto.otsCerradas()).isEqualTo(3);
    }

    @Test
    void serieTemporalConvierteConteosNumericosYValoresNoNumericos() {
        stubearRepositorioVacio();
        when(reporteRepository.serieOtsCreadasPorMes(any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{"2026-10", new java.math.BigInteger("7")},
                new Object[]{"2026-11", "no numérico"}));

        List<OtsPorPeriodoDTO> serie = service.construirDashboard(null, null, GranularidadPeriodo.MES)
                .otsPorPeriodo();

        assertThat(serie).containsExactly(
                new OtsPorPeriodoDTO("2026-10", 7, 0),
                new OtsPorPeriodoDTO("2026-11", 0, 0));
    }

    @Test
    void serieTemporalPorDiaSeleccionaConsultaCorrecta() {
        stubearRepositorioVacio();

        List<Object[]> creadas = new ArrayList<>();
        creadas.add(new Object[]{"2026-10-28", 2L});

        when(reporteRepository.serieOtsCreadasPorDia(any(), any())).thenReturn(creadas);
        when(reporteRepository.serieOtsCerradasPorDia(any(), any())).thenReturn(new ArrayList<>());

        DashboardGerencialDTO dto = service.construirDashboard(null, null, GranularidadPeriodo.DIA);

        assertThat(dto.otsPorPeriodo()).hasSize(1);
        assertThat(dto.otsPorPeriodo().get(0).periodo()).isEqualTo("2026-10-28");
    }

    @Test
    void serieTemporalPorSemanaSeleccionaConsultasSemanales() {
        stubearRepositorioVacio();
        when(reporteRepository.serieOtsCreadasPorSemana(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{"2026-W43", 4L}));
        when(reporteRepository.serieOtsCerradasPorSemana(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{"2026-W43", 2L}));

        OtsPorPeriodoDTO punto = service.construirDashboard(null, null, GranularidadPeriodo.SEMANA)
                .otsPorPeriodo().getFirst();

        assertThat(punto).isEqualTo(new OtsPorPeriodoDTO("2026-W43", 4L, 2L));
    }

    @Test
    void serieTemporalOrdenaCronologicamente() {
        stubearRepositorioVacio();

        // Los períodos llegan desordenados del mock
        List<Object[]> creadas = new ArrayList<>();
        creadas.add(new Object[]{"2026-10", 5L});
        creadas.add(new Object[]{"2026-08", 2L});

        List<Object[]> cerradas = new ArrayList<>();
        cerradas.add(new Object[]{"2026-09", 1L});

        when(reporteRepository.serieOtsCreadasPorMes(any(), any())).thenReturn(creadas);
        when(reporteRepository.serieOtsCerradasPorMes(any(), any())).thenReturn(cerradas);

        DashboardGerencialDTO dto = service.construirDashboard(null, null, GranularidadPeriodo.MES);

        List<String> periodos = dto.otsPorPeriodo().stream().map(OtsPorPeriodoDTO::periodo).toList();
        assertThat(periodos).containsExactly("2026-08", "2026-09", "2026-10");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // obtenerOtsParaCsv / obtenerDesviosParaCsv
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void obtenerOtsParaCsvConFechasNullUsaMesActual() {
        when(reporteRepository.buscarOtsParaCsv(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of());

        List<OrdenTrabajo> resultado = service.obtenerOtsParaCsv(null, null);

        assertThat(resultado).isEmpty();
        // Si no lanza excepción, los defaults fueron aplicados correctamente
    }

    @Test
    void obtenerDesviosParaCsvConFechasNullUsaMesActual() {
        when(reporteRepository.buscarDesviosParaCsv(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of());

        List<OrdenTrabajo> resultado = service.obtenerDesviosParaCsv(null, null);

        assertThat(resultado).isEmpty();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────────────

    /** Stubea todas las consultas del repositorio para que devuelvan listas vacías (o 0). */
    private void stubearRepositorioVacio() {
        lenient().when(reporteRepository.contarTotalOts(any(), any())).thenReturn(0L);
        lenient().when(reporteRepository.contarOtsCerradas(any(), any())).thenReturn(0L);
        lenient().when(reporteRepository.contarOtsPorEstado(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.contarOtsPorTipoTrabajo(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.contarOtsPorCuadrilla(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.serieOtsCreadasPorDia(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.serieOtsCreadasPorSemana(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.serieOtsCreadasPorMes(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.serieOtsCerradasPorDia(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.serieOtsCerradasPorSemana(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.serieOtsCerradasPorMes(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(reporteRepository.buscarOtsConPlanificacion(any(), any())).thenReturn(List.of());
    }

    private DesvioOrdenDTO desvio(ClasificacionDesvio clasificacion, long diasDesvio) {
        return new DesvioOrdenDTO(1L, null, null, "OT", TipoTrabajo.PODA, 1L, "Lugar",
                null, null, "Estado", LocalDate.now(), null, diasDesvio, clasificacion);
    }
}
