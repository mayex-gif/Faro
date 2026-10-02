package com.faro.backend.config;

import com.faro.backend.models.EstadoOrden;
import com.faro.backend.models.OrdenTrabajo;
import com.faro.backend.models.TransicionEstado;
import com.faro.backend.repositories.EstadoOrdenRepository;
import com.faro.backend.repositories.OrdenTrabajoRepository;
import com.faro.backend.repositories.TransicionEstadoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Se ejecuta SOLO una vez cada vez que arranca el backend.
 * 1) Si la tabla de estados está vacía, carga el flujo por defecto (estados + caminos permitidos).
 * 2) Si hay OT sin estado (las creadas antes de esta tarjeta), les pone el estado inicial.
 */
@Component
public class InicializadorEstados implements CommandLineRunner {

    private final EstadoOrdenRepository estadoRepository;
    private final TransicionEstadoRepository transicionRepository;
    private final OrdenTrabajoRepository ordenRepository;

    public InicializadorEstados(EstadoOrdenRepository estadoRepository,
                                TransicionEstadoRepository transicionRepository,
                                OrdenTrabajoRepository ordenRepository) {
        this.estadoRepository = estadoRepository;
        this.transicionRepository = transicionRepository;
        this.ordenRepository = ordenRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Solo la primera vez: si ya hay estados (porque alguien los configuró), no se tocan
        if (estadoRepository.count() == 0) {
            cargarFlujoPorDefecto();
        }
        asignarEstadoInicialAOrdenesSinEstado();
    }

    private void cargarFlujoPorDefecto() {
        // nombre, color (los de la guía de estilos), inicial, cierre, posición
        EstadoOrden pendiente   = estadoRepository.save(new EstadoOrden("Pendiente",   "#566A73", true,  false, 1));
        EstadoOrden planificada = estadoRepository.save(new EstadoOrden("Planificada", "#086C80", false, false, 2));
        EstadoOrden enCurso     = estadoRepository.save(new EstadoOrden("En curso",    "#9A4A12", false, false, 3));
        EstadoOrden finalizada  = estadoRepository.save(new EstadoOrden("Finalizada",  "#22633E", false, true,  4));
        EstadoOrden cancelada   = estadoRepository.save(new EstadoOrden("Cancelada",   "#A52A27", false, true,  5));

        // Los caminos permitidos (cada línea es una "flecha" del dibujo)
        transicionRepository.saveAll(List.of(
                new TransicionEstado(pendiente, planificada),
                new TransicionEstado(pendiente, enCurso),
                new TransicionEstado(pendiente, cancelada),
                new TransicionEstado(planificada, enCurso),
                new TransicionEstado(planificada, pendiente),
                new TransicionEstado(planificada, cancelada),
                new TransicionEstado(enCurso, finalizada),
                new TransicionEstado(enCurso, cancelada)
        ));
    }

    private void asignarEstadoInicialAOrdenesSinEstado() {
        List<OrdenTrabajo> sinEstado = ordenRepository.findByEstadoIsNull();
        if (sinEstado.isEmpty()) {
            return; // nada que arreglar
        }
        EstadoOrden inicial = estadoRepository.findFirstByInicialTrue()
                .orElseThrow(() -> new IllegalStateException("No hay un estado inicial configurado"));
        sinEstado.forEach(orden -> orden.setEstado(inicial));
        ordenRepository.saveAll(sinEstado);
    }
}