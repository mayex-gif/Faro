package com.faro.backend.services;

import com.faro.backend.dto.GeneracionOrdenesResultadoDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MotorMantenimientoScheduler")
class MotorMantenimientoSchedulerTest {

    @Mock
    private MotorMantenimientoService motorService;

    @InjectMocks
    private MotorMantenimientoScheduler scheduler;

    @Test
    @DisplayName("El scheduler invoca a generarOrdenesPendientes para la fecha actual")
    void schedulerInvocaGeneracion() {
        GeneracionOrdenesResultadoDTO resultado = new GeneracionOrdenesResultadoDTO(
                LocalDate.now(), 2, 1, List.of()
        );
        when(motorService.generarOrdenesPendientes(any(LocalDate.class))).thenReturn(resultado);

        scheduler.ejecutarAutogeneracionProgramada();

        verify(motorService).generarOrdenesPendientes(any(LocalDate.class));
    }

    @Test
    @DisplayName("El scheduler maneja excepciones sin propagar el error")
    void schedulerManejaExcepcion() {
        when(motorService.generarOrdenesPendientes(any(LocalDate.class)))
                .thenThrow(new RuntimeException("Error inesperado en BD"));

        // No debe lanzar excepción hacia afuera
        scheduler.ejecutarAutogeneracionProgramada();

        verify(motorService).generarOrdenesPendientes(any(LocalDate.class));
    }
}
