package com.faro.backend.services;

import com.faro.backend.exceptions.RecursoNoEncontradoException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** El almacén en memoria tiene que comportarse como el de verdad: lo que se guarda se puede leer, igual y completo. */
class AlmacenEnMemoriaTest {

    private final AlmacenEnMemoria almacen = new AlmacenEnMemoria();

    @Test
    void loGuardado_seLeeIgual() {
        byte[] foto = {1, 2, 3, (byte) 0xFF, 0};

        almacen.guardar("comentarios/7/foto-1.jpg", foto, "image/jpeg");

        assertThat(almacen.leer("comentarios/7/foto-1.jpg")).containsExactly(foto);
    }

    @Test
    void guardarConLaMismaClave_reemplaza() {
        almacen.guardar("foto", new byte[]{1}, "image/png");
        almacen.guardar("foto", new byte[]{2, 2}, "image/png");

        assertThat(almacen.leer("foto")).containsExactly(2, 2);
    }

    @Test
    void modificarElArregloDespues_noCambiaLoGuardado() {
        byte[] original = {1, 2, 3};
        almacen.guardar("foto", original, "image/png");

        original[0] = 99;
        almacen.leer("foto")[1] = 99;

        assertThat(almacen.leer("foto")).containsExactly(1, 2, 3);
    }

    @Test
    void leerAlgoQueNoExiste_dice404() {
        assertThatThrownBy(() -> almacen.leer("no-existe"))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessage("La foto no está en el almacén");
    }

    @Test
    void borrar_quitaElArchivo_yBorrarDosVecesDaLoMismo() {
        almacen.guardar("foto", new byte[]{1}, "image/png");

        almacen.borrar("foto");

        assertThatThrownBy(() -> almacen.leer("foto")).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatCode(() -> almacen.borrar("foto")).doesNotThrowAnyException();
    }
}
