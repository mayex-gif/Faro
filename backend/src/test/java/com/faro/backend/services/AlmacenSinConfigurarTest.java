package com.faro.backend.services;

import com.faro.backend.exceptions.AlmacenNoDisponibleException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Sin claves de S3, todo pedido de fotos avisa que falta configurar el almacén. */
class AlmacenSinConfigurarTest {

    private final AlmacenSinConfigurar almacen = new AlmacenSinConfigurar();

    @Test
    void guardar_avisaQueFaltaConfigurar() {
        assertThatThrownBy(() -> almacen.guardar("a.jpg", new byte[]{1}, "image/jpeg"))
                .isInstanceOf(AlmacenNoDisponibleException.class)
                .hasMessage(AlmacenSinConfigurar.MENSAJE);
    }

    @Test
    void leer_avisaQueFaltaConfigurar() {
        assertThatThrownBy(() -> almacen.leer("a.jpg"))
                .isInstanceOf(AlmacenNoDisponibleException.class)
                .hasMessage(AlmacenSinConfigurar.MENSAJE);
    }

    @Test
    void borrar_avisaQueFaltaConfigurar() {
        assertThatThrownBy(() -> almacen.borrar("a.jpg"))
                .isInstanceOf(AlmacenNoDisponibleException.class)
                .hasMessage(AlmacenSinConfigurar.MENSAJE);
    }
}
