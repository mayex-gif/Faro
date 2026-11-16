package com.faro.backend.services;

import com.faro.backend.exceptions.AlmacenNoDisponibleException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Almacén de fotos sobre S3 (el "idioma" estándar de los depósitos de archivos en la nube).
 * Todo va a un solo bucket (la "caja" del depósito) y es privado: las fotos solo se ven
 * a través del backend, con sesión iniciada.
 *
 * El bucket NO se revisa al arrancar (así el backend arranca aunque el depósito esté apagado):
 * si al guardar la primera foto el bucket no existe, se crea y se reintenta una vez.
 */
public class AlmacenS3 implements AlmacenArchivos, AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(AlmacenS3.class);
    static final String MENSAJE_NO_DISPONIBLE = "El almacén de fotos no responde. Probá de nuevo en un rato.";

    private final S3Client cliente;
    private final String bucket;

    public AlmacenS3(S3Client cliente, String bucket) {
        this.cliente = cliente;
        this.bucket = bucket;
    }

    @Override
    public void guardar(String clave, byte[] contenido, String tipoContenido) {
        try {
            subir(clave, contenido, tipoContenido);
        } catch (S3Exception e) {
            if (!esBucketInexistente(e)) {
                throw noDisponible("guardar", clave, e);
            }
            crearBucket();
            try {
                subir(clave, contenido, tipoContenido);
            } catch (SdkException otraVez) {
                throw noDisponible("guardar", clave, otraVez);
            }
        } catch (SdkException e) {
            throw noDisponible("guardar", clave, e);
        }
    }

    @Override
    public byte[] leer(String clave) {
        try {
            GetObjectRequest pedido = GetObjectRequest.builder().bucket(bucket).key(clave).build();
            return cliente.getObjectAsBytes(pedido).asByteArray();
        } catch (NoSuchKeyException e) {
            throw new RecursoNoEncontradoException("La foto no está en el almacén");
        } catch (S3Exception e) {
            if (esBucketInexistente(e)) { // todavía no se guardó ninguna foto
                throw new RecursoNoEncontradoException("La foto no está en el almacén");
            }
            throw noDisponible("leer", clave, e);
        } catch (SdkException e) {
            throw noDisponible("leer", clave, e);
        }
    }

    @Override
    public void borrar(String clave) {
        try {
            cliente.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(clave).build());
        } catch (S3Exception e) {
            if (!esBucketInexistente(e)) { // sin bucket no hay nada que borrar
                throw noDisponible("borrar", clave, e);
            }
        } catch (SdkException e) {
            throw noDisponible("borrar", clave, e);
        }
    }

    /** Spring lo llama al apagar el backend: cierra las conexiones con el depósito. */
    @Override
    public void close() {
        cliente.close();
    }

    private void subir(String clave, byte[] contenido, String tipoContenido) {
        PutObjectRequest pedido = PutObjectRequest.builder()
                .bucket(bucket)
                .key(clave)
                .contentType(tipoContenido)
                .contentLength((long) contenido.length)
                .build();
        cliente.putObject(pedido, RequestBody.fromBytes(contenido));
    }

    private void crearBucket() {
        try {
            cliente.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            log.info("Se creó el bucket de fotos '{}'", bucket);
        } catch (S3Exception e) {
            // Si otro pedido lo creó al mismo tiempo, está bien: ya existe
            String codigo = codigoDeError(e);
            if (!"BucketAlreadyOwnedByYou".equals(codigo) && !"BucketAlreadyExists".equals(codigo)) {
                throw noDisponible("crear el bucket para", bucket, e);
            }
        } catch (SdkException e) {
            throw noDisponible("crear el bucket para", bucket, e);
        }
    }

    private static boolean esBucketInexistente(S3Exception e) {
        return "NoSuchBucket".equals(codigoDeError(e));
    }

    private static String codigoDeError(S3Exception e) {
        return e.awsErrorDetails() == null ? null : e.awsErrorDetails().errorCode();
    }

    // El detalle técnico va al log del servidor; a quien pidió le llega un mensaje simple.
    private AlmacenNoDisponibleException noDisponible(String accion, String clave, SdkException e) {
        log.warn("No se pudo {} '{}' en el almacén de fotos: {}", accion, clave, e.getMessage());
        return new AlmacenNoDisponibleException(MENSAJE_NO_DISPONIBLE, e);
    }
}
