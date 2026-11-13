package com.faro.backend.services;

/**
 * El "depósito" de archivos de FARO (por ahora, las fotos de los comentarios de las OT).
 * Guarda los bytes de cada archivo con una "clave" (su nombre dentro del depósito).
 *
 * Es una interfaz para que el resto del backend no dependa de DÓNDE se guardan:
 * hoy es un almacén S3 (RustFS en la compu, Backblaze B2 o Cloudflare R2 en Render);
 * cambiar de proveedor es cambiar las variables FARO_S3_*, no el código.
 */
public interface AlmacenArchivos {

    /** Guarda (o reemplaza) el archivo con esa clave. Si el depósito no responde: AlmacenNoDisponibleException. */
    void guardar(String clave, byte[] contenido, String tipoContenido);

    /** Devuelve los bytes del archivo. Si no existe: RecursoNoEncontradoException (404). */
    byte[] leer(String clave);

    /** Borra el archivo. Si ya no estaba, no pasa nada (borrar dos veces da lo mismo). */
    void borrar(String clave);
}
