package com.faro.backend.services;

import com.faro.backend.models.*;
import com.faro.backend.dto.DesvioOrdenDTO;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import static org.assertj.core.api.Assertions.assertThat;

class ExportacionCsvServiceTest {

    private final ExportacionCsvService service = new ExportacionCsvService(new CalculoDesvioService());

    @Test
    void csvDeOtsEscribeDatosCompletaYEscapaCamposEspeciales() {
        EstadoOrden estado = new EstadoOrden("Estado \"A\"", "#123456", false, true, 1);
        Cuadrilla cuadrilla = new Cuadrilla("Equipo\nVerde", 3, true, Set.of(TipoTrabajo.PODA));
        PuntoInfraestructura lugar = lugar("Plaza\rCentral");
        OrdenTrabajo completa = orden(1L, "Sector; norte", TipoTrabajo.PODA, estado, lugar);
        completa.setCuadrilla(cuadrilla);
        completa.setFechaCreacion(LocalDateTime.of(2026, 10, 2, 8, 5));
        completa.setFechaFinalizacion(LocalDateTime.of(2026, 10, 3, 14, 30));

        OrdenTrabajo conOpcionalesNull = orden(2L, null, TipoTrabajo.BACHEO, null, null);

        String csv = texto(service.generarCsvOts(List.of(completa, conOpcionalesNull)));

        assertThat(csv).startsWith("\uFEFFID OT;Descripcion;Estado;");
        assertThat(csv).contains("\"Sector; norte\"");
        assertThat(csv).contains("\"Estado \"\"A\"\"\"");
        assertThat(csv).contains("\"Equipo\nVerde\"");
        assertThat(csv).contains("\"Plaza\rCentral\"");
        assertThat(csv).contains("02/10/2026 08:05;03/10/2026 14:30");
        assertThat(csv).contains("2;;Sin estado;BACHEO;Sin asignar;;ORDEN_DIRECTA;MEDIA;;\r\n");
    }

    @Test
    void csvDeOtsVacioConservaLaCabecera() {
        String csv = texto(service.generarCsvOts(List.of()));

        assertThat(csv).startsWith("\uFEFFID OT;");
        assertThat(csv).endsWith("Fecha Finalizacion\r\n");
    }

    @Test
    void csvDeDesviosCubrePendientesFinalizadasYCamposOpcionales() {
        LocalDate hoy = LocalDate.now();
        EstadoOrden pendiente = new EstadoOrden("Pendiente", "#123456", true, false, 1);
        OrdenTrabajo sinOpcionales = orden(10L, "OT", TipoTrabajo.PODA, pendiente, lugar(null));
        sinOpcionales.setOrigen(OrigenOrden.PLAN_MANTENIMIENTO);
        sinOpcionales.setFechaCreacion(hoy.atStartOfDay());
        sinOpcionales.setFechaPlanificada(hoy.plusDays(2));

        EstadoOrden finalizada = new EstadoOrden("Finalizada", "#123456", false, true, 2);
        Cuadrilla cuadrilla = new Cuadrilla("Cuadrilla\"Sur\"", 2, true, Set.of(TipoTrabajo.PINTURA));
        PuntoInfraestructura plaza = lugar("Plaza; Centro");
        OrdenTrabajo ejecutada = orden(11L, "OT finalizada", TipoTrabajo.PINTURA, finalizada, plaza);
        ejecutada.setOrigen(OrigenOrden.PLAN_MANTENIMIENTO);
        ejecutada.setCuadrilla(cuadrilla);
        ejecutada.setFechaCreacion(hoy.minusDays(3).atStartOfDay());
        ejecutada.setFechaPlanificada(hoy.minusDays(2));
        ejecutada.setFechaFinalizacion(hoy.atTime(11, 0));
        ReglaMantenimiento regla = new ReglaMantenimiento();
        regla.setId(5L);
        regla.setTitulo("Regla; especial");
        ejecutada.setReglaMantenimiento(regla);

        String csv = texto(service.generarCsvDesvios(List.of(sinOpcionales, ejecutada)));

        assertThat(csv).startsWith("\uFEFFID OT;Regla de Mantenimiento;");
        assertThat(csv).contains("10;;PODA;;Sin asignar;");
        assertThat(csv).contains("11;\"Regla; especial\";PINTURA;\"Plaza; Centro\";");
        assertThat(csv).contains("\"Cuadrilla\"\"Sur\"\"");
        assertThat(csv).contains(";2;DEMORADA\r\n");
    }

    @Test
    void csvDeDesviosVacioConservaLaCabecera() {
        String csv = texto(service.generarCsvDesvios(List.of()));

        assertThat(csv).startsWith("\uFEFFID OT;Regla de Mantenimiento;");
        assertThat(csv).endsWith("Clasificacion\r\n");
    }

    @Test
    void csvDeDesviosToleraDatosOpcionalesNulosDelResultadoDeCalculo() {
        CalculoDesvioService calculador = mock(CalculoDesvioService.class);
        ExportacionCsvService exportador = new ExportacionCsvService(calculador);
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(12L);
        DesvioOrdenDTO desvio = new DesvioOrdenDTO(12L, null, null, "OT", TipoTrabajo.PODA,
                null, null, null, null, null, null, null, 0, ClasificacionDesvio.CANCELADA);
        when(calculador.evaluarOrden(any(), any())).thenReturn(desvio);

        String csv = texto(exportador.generarCsvDesvios(List.of(orden)));

        assertThat(csv).contains("12;;PODA;;Sin asignar;;;0;CANCELADA\r\n");
    }

    private OrdenTrabajo orden(Long id, String descripcion, TipoTrabajo tipo, EstadoOrden estado,
                               PuntoInfraestructura lugar) {
        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setId(id);
        orden.setDescripcion(descripcion);
        orden.setTipo(tipo);
        orden.setOrigen(OrigenOrden.ORDEN_DIRECTA);
        orden.setPrioridad(PrioridadOrden.MEDIA);
        orden.setEstado(estado);
        orden.setLugar(lugar);
        return orden;
    }

    private PuntoInfraestructura lugar(String nombre) {
        PuntoInfraestructura lugar = new PuntoInfraestructura();
        lugar.setId(3L);
        lugar.setNombre(nombre);
        return lugar;
    }

    private String texto(byte[] csv) {
        return new String(csv, StandardCharsets.UTF_8);
    }
}
