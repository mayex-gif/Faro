package com.faro.backend.dto;

import com.faro.backend.models.RolUsuario;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CrearUsuarioRequestDTOTest {

    @Test
    void obtenerActivoPorDefectoRetornaTrueCuandoEsNull() {
        CrearUsuarioRequestDTO request = new CrearUsuarioRequestDTO(
                "Martín", "Gómez", "encargado@generalpaz.gob.ar", "pass123",
                RolUsuario.ENCARGADO_CORRALON, null, null
        );

        assertTrue(request.obtenerActivoPorDefecto());
    }

    @Test
    void obtenerActivoPorDefectoRetornaValorCuandoEstaPresente() {
        CrearUsuarioRequestDTO activoTrue = new CrearUsuarioRequestDTO(
                "Martín", "Gómez", "encargado@generalpaz.gob.ar", "pass123",
                RolUsuario.ENCARGADO_CORRALON, null, true
        );
        assertTrue(activoTrue.obtenerActivoPorDefecto());

        CrearUsuarioRequestDTO activoFalse = new CrearUsuarioRequestDTO(
                "Martín", "Gómez", "encargado@generalpaz.gob.ar", "pass123",
                RolUsuario.ENCARGADO_CORRALON, null, false
        );
        assertFalse(activoFalse.obtenerActivoPorDefecto());
    }
}
