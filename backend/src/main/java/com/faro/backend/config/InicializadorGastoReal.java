package com.faro.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Se ejecuta cada vez que arranca el backend, pero solo hace algo la primera vez.
 * Pasa los gastos del pop-up de #74 ("¿Hubo algún otro gasto?" = lo que se gastó DE MÁS, columna gasto_adicional)
 * al dato nuevo "¿Cuánto se gastó en total?" (columna gasto_real), con la misma cuenta que usa el backend
 * cuando llega el dato viejo: gasto total = lo declarado al crear la OT (o 0) + el gasto adicional.
 * Ej: declarado $ 20.000 + adicional $ 3.000 → gasto real $ 23.000.
 *
 * Lo hace en las OT (ordenes_trabajo) y en la bitácora (eventos_orden, para la ficha del lugar).
 * Solo toca las filas que tienen gasto adicional y todavía no tienen gasto real: la segunda vez que arranca
 * ya no encuentra ninguna. La columna gasto_adicional no se borra (ddl-auto=update no borra columnas).
 * Si la base es nueva y esa columna no existe, no hay nada que pasar.
 * Usa SQL directo (JdbcTemplate) porque la bitácora ya no tiene el campo viejo en el modelo.
 */
@Component
public class InicializadorGastoReal implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(InicializadorGastoReal.class);

    static final String PASAR_ORDENES =
            "UPDATE ordenes_trabajo SET gasto_real = COALESCE(monto_aproximado, 0) + gasto_adicional "
            + "WHERE gasto_adicional IS NOT NULL AND gasto_real IS NULL";

    // En la bitácora: lo declarado sale de la OT (una OT finalizada ya no se edita)
    static final String PASAR_EVENTOS =
            "UPDATE eventos_orden ev SET gasto_real = COALESCE(ot.monto_aproximado, 0) + ev.gasto_adicional "
            + "FROM ordenes_trabajo ot WHERE ot.id = ev.orden_id "
            + "AND ev.gasto_adicional IS NOT NULL AND ev.gasto_real IS NULL";

    static final String EXISTE_COLUMNA =
            "SELECT COUNT(*) FROM information_schema.columns "
            + "WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?";

    private final JdbcTemplate jdbc;

    public InicializadorGastoReal(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void run(String... args) {
        int ordenes = existeColumna("ordenes_trabajo", "gasto_adicional") ? jdbc.update(PASAR_ORDENES) : 0;
        int eventos = existeColumna("eventos_orden", "gasto_adicional") ? jdbc.update(PASAR_EVENTOS) : 0;
        if (ordenes > 0 || eventos > 0) {
            log.info("Gasto real: se pasaron {} OT y {} renglones de la bitácora del gasto adicional al gasto total.",
                    ordenes, eventos);
        }
    }

    private boolean existeColumna(String tabla, String columna) {
        Integer cantidad = jdbc.queryForObject(EXISTE_COLUMNA, Integer.class, tabla, columna);
        return cantidad != null && cantidad > 0;
    }
}
