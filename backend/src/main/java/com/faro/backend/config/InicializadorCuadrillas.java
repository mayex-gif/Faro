package com.faro.backend.config;

import com.faro.backend.models.Cuadrilla;
import com.faro.backend.models.TipoTrabajo;
import com.faro.backend.repositories.CuadrillaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Se ejecuta solo una vez cuando arranca el backend.
 * Si la tabla de cuadrillas está vacía, precarga cuadrillas base para pruebas y funcionamiento del corralón.
 */
@Component
public class InicializadorCuadrillas implements CommandLineRunner {

    private final CuadrillaRepository cuadrillaRepository;

    public InicializadorCuadrillas(CuadrillaRepository cuadrillaRepository) {
        this.cuadrillaRepository = cuadrillaRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (cuadrillaRepository.count() == 0) {
            cargarCuadrillasPorDefecto();
        }
    }

    private void cargarCuadrillasPorDefecto() {
        cuadrillaRepository.saveAll(List.of(
                new Cuadrilla("Cuadrilla Verde", 4, true,
                        Set.of(TipoTrabajo.PODA, TipoTrabajo.CORTE_DE_PASTO, TipoTrabajo.LIMPIEZA)),
                new Cuadrilla("Cuadrilla Alumbrado", 2, true,
                        Set.of(TipoTrabajo.ALUMBRADO)),
                new Cuadrilla("Cuadrilla Vial", 5, true,
                        Set.of(TipoTrabajo.BACHEO, TipoTrabajo.PINTURA)),
                new Cuadrilla("Cuadrilla Servicios Generales", 3, true,
                        Set.of(TipoTrabajo.OTRO, TipoTrabajo.LIMPIEZA))
        ));
    }
}
