package com.faro.backend.services;

import com.faro.backend.exceptions.AlmacenNoDisponibleException;

/**
 * Almacén "de repuesto" que se usa cuando faltan las claves FARO_S3_ACCESS_KEY / FARO_S3_SECRET_KEY.
 * Así el backend arranca igual (en los tests, en SonarCloud o en una compu sin el depósito de fotos)
 * y solo fallan, con un mensaje claro, los pedidos que usan fotos.
 */
public class AlmacenSinConfigurar implements AlmacenArchivos {

    static final String MENSAJE =
            "El almacén de fotos no está configurado: faltan las variables FARO_S3_ACCESS_KEY y FARO_S3_SECRET_KEY";

    @Override
    public void guardar(String clave, byte[] contenido, String tipoContenido) {
        throw new AlmacenNoDisponibleException(MENSAJE);
    }

    @Override
    public byte[] leer(String clave) {
        throw new AlmacenNoDisponibleException(MENSAJE);
    }

    @Override
    public void borrar(String clave) {
        throw new AlmacenNoDisponibleException(MENSAJE);
    }
}
