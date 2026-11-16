package com.faro.backend.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Tests del InicializadorGastoReal con la base "de mentira" (mock): qué cuentas manda y cuándo NO hace nada.
 * La prueba con PostgreSQL de verdad está en InicializadorGastoRealPostgresIntegrationTest.
 */
@ExtendWith(MockitoExtension.class)
class InicializadorGastoRealTest {

    @Mock
    private JdbcTemplate jdbc;

    @InjectMocks
    private InicializadorGastoReal inicializador;

    private void laColumnaViejaExisteEn(String tabla, boolean existe) {
        when(jdbc.queryForObject(InicializadorGastoReal.EXISTE_COLUMNA, Integer.class, tabla, "gasto_adicional"))
                .thenReturn(existe ? 1 : 0);
    }

    @Test
    void conLaColumnaViejaPasaLasOtYLaBitacora() {
        laColumnaViejaExisteEn("ordenes_trabajo", true);
        laColumnaViejaExisteEn("eventos_orden", true);

        inicializador.run();

        verify(jdbc).update(InicializadorGastoReal.PASAR_ORDENES);
        verify(jdbc).update(InicializadorGastoReal.PASAR_EVENTOS);
    }

    @Test
    void enUnaBaseNuevaSinLaColumnaViejaNoHaceNada() {
        laColumnaViejaExisteEn("ordenes_trabajo", false);
        laColumnaViejaExisteEn("eventos_orden", false);

        inicializador.run();

        verify(jdbc, never()).update(anyString());
    }

    @Test
    void siSoloLaOtTieneLaColumnaViejaPasaSoloLasOt() {
        laColumnaViejaExisteEn("ordenes_trabajo", true);
        laColumnaViejaExisteEn("eventos_orden", false);

        inicializador.run();

        verify(jdbc).update(InicializadorGastoReal.PASAR_ORDENES);
        verify(jdbc, never()).update(eq(InicializadorGastoReal.PASAR_EVENTOS));
    }
}
