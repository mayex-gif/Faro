package com.faro.backend.services;

import com.faro.backend.exceptions.RecursoNoEncontradoException;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Almacén de fotos "de bolsillo" para desarrollar en la compu sin tener el depósito S3 andando
 * (FARO_ALMACEN=memoria). Guarda los bytes de verdad, así que el recorrido completo funciona igual
 * que con S3: se publica un comentario con fotos, se baja la foto y se ve.
 *
 * Límite a tener presente: todo vive en la memoria del backend. Al reiniciarlo (por ejemplo, cada vez que se
 * reconstruye la imagen de Docker) los archivos desaparecen, pero las filas de la base siguen ahí: esas fotos
 * responden 404 y la pantalla muestra "No se pudo cargar". Para conservarlas entre reinicios hay que usar RustFS (S3).
 *
 * NUNCA en producción: con más de un servidor, o al reiniciar, se perderían las evidencias.
 */
public class AlmacenEnMemoria implements AlmacenArchivos {

    private final Map<String, byte[]> archivos = new ConcurrentHashMap<>();

    @Override
    public void guardar(String clave, byte[] contenido, String tipoContenido) {
        // Se guarda una copia: si quien llamó modifica su arreglo después, lo guardado no cambia
        archivos.put(clave, contenido.clone());
    }

    @Override
    public byte[] leer(String clave) {
        byte[] contenido = archivos.get(clave);
        if (contenido == null) {
            throw new RecursoNoEncontradoException("La foto no está en el almacén");
        }
        return contenido.clone();
    }

    @Override
    public void borrar(String clave) {
        archivos.remove(clave); // si ya no estaba, no pasa nada
    }
}
