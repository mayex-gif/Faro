package com.faro.backend.services;

import com.faro.backend.exceptions.AlmacenNoDisponibleException;
import com.faro.backend.exceptions.RecursoNoEncontradoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Prueba el almacén S3 con un cliente falso (no hace falta un depósito de verdad). */
@ExtendWith(MockitoExtension.class)
class AlmacenS3Test {

    private static final byte[] FOTO = {1, 2, 3, 4};

    @Mock
    private S3Client cliente;

    private AlmacenS3 almacen;

    @BeforeEach
    void setUp() {
        almacen = new AlmacenS3(cliente, "faro-fotos");
    }

    private static S3Exception errorS3(String codigo, int estado) {
        return (S3Exception) S3Exception.builder()
                .statusCode(estado)
                .awsErrorDetails(AwsErrorDetails.builder().errorCode(codigo).build())
                .message(codigo)
                .build();
    }

    // ---------- guardar ----------

    @Test
    void guardar_subeLaFotoAlBucketConSuClaveYSuTipo() {
        almacen.guardar("comentarios/1/foto.jpg", FOTO, "image/jpeg");

        ArgumentCaptor<PutObjectRequest> pedido = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(cliente).putObject(pedido.capture(), any(RequestBody.class));
        assertThat(pedido.getValue().bucket()).isEqualTo("faro-fotos");
        assertThat(pedido.getValue().key()).isEqualTo("comentarios/1/foto.jpg");
        assertThat(pedido.getValue().contentType()).isEqualTo("image/jpeg");
        assertThat(pedido.getValue().contentLength()).isEqualTo(4L);
        verify(cliente, never()).createBucket(any(CreateBucketRequest.class));
    }

    @Test
    void guardar_siElBucketNoExiste_loCreaYVuelveAIntentar() {
        when(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(errorS3("NoSuchBucket", 404))
                .thenReturn(PutObjectResponse.builder().build());

        almacen.guardar("a.jpg", FOTO, "image/jpeg");

        ArgumentCaptor<CreateBucketRequest> creado = ArgumentCaptor.forClass(CreateBucketRequest.class);
        verify(cliente).createBucket(creado.capture());
        assertThat(creado.getValue().bucket()).isEqualTo("faro-fotos");
        verify(cliente, times(2)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void guardar_siOtroPedidoCreoElBucketAlMismoTiempo_sigueIgual() {
        when(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(errorS3("NoSuchBucket", 404))
                .thenReturn(PutObjectResponse.builder().build());
        when(cliente.createBucket(any(CreateBucketRequest.class)))
                .thenThrow(errorS3("BucketAlreadyOwnedByYou", 409));

        almacen.guardar("a.jpg", FOTO, "image/jpeg");

        verify(cliente, times(2)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void guardar_siNoSePuedeCrearElBucket_avisaQueNoEstaDisponible() {
        when(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(errorS3("NoSuchBucket", 404));
        when(cliente.createBucket(any(CreateBucketRequest.class)))
                .thenThrow(errorS3("AccessDenied", 403));

        assertThatThrownBy(() -> almacen.guardar("a.jpg", FOTO, "image/jpeg"))
                .isInstanceOf(AlmacenNoDisponibleException.class)
                .hasMessage(AlmacenS3.MENSAJE_NO_DISPONIBLE);
    }

    @Test
    void guardar_siElReintentoTambienFalla_avisaQueNoEstaDisponible() {
        when(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(errorS3("NoSuchBucket", 404))
                .thenThrow(SdkClientException.create("se cortó la conexión"));

        assertThatThrownBy(() -> almacen.guardar("a.jpg", FOTO, "image/jpeg"))
                .isInstanceOf(AlmacenNoDisponibleException.class);
    }

    @Test
    void guardar_conClavesIncorrectas_avisaQueNoEstaDisponibleSinCrearBucket() {
        when(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(errorS3("InvalidAccessKeyId", 403));

        assertThatThrownBy(() -> almacen.guardar("a.jpg", FOTO, "image/jpeg"))
                .isInstanceOf(AlmacenNoDisponibleException.class);
        verify(cliente, never()).createBucket(any(CreateBucketRequest.class));
    }

    @Test
    void guardar_sinConexion_avisaQueNoEstaDisponible() {
        when(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(SdkClientException.create("Connection refused"));

        assertThatThrownBy(() -> almacen.guardar("a.jpg", FOTO, "image/jpeg"))
                .isInstanceOf(AlmacenNoDisponibleException.class)
                .hasCauseInstanceOf(SdkClientException.class);
    }

    @Test
    void guardar_unErrorSinDetalle_avisaQueNoEstaDisponible() {
        when(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(S3Exception.builder().statusCode(500).message("sin detalle").build());

        assertThatThrownBy(() -> almacen.guardar("a.jpg", FOTO, "image/jpeg"))
                .isInstanceOf(AlmacenNoDisponibleException.class);
    }

    // ---------- leer ----------

    @Test
    void leer_devuelveLosBytesDeLaFoto() {
        when(cliente.getObjectAsBytes(any(GetObjectRequest.class)))
                .thenReturn(ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), FOTO));

        assertThat(almacen.leer("a.jpg")).containsExactly(FOTO);

        ArgumentCaptor<GetObjectRequest> pedido = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(cliente).getObjectAsBytes(pedido.capture());
        assertThat(pedido.getValue().bucket()).isEqualTo("faro-fotos");
        assertThat(pedido.getValue().key()).isEqualTo("a.jpg");
    }

    @Test
    void leer_unaFotoQueNoEsta_da404() {
        when(cliente.getObjectAsBytes(any(GetObjectRequest.class)))
                .thenThrow(NoSuchKeyException.builder().message("no está").build());

        assertThatThrownBy(() -> almacen.leer("no-esta.jpg"))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void leer_sinBucketTodavia_da404() {
        when(cliente.getObjectAsBytes(any(GetObjectRequest.class))).thenThrow(errorS3("NoSuchBucket", 404));

        assertThatThrownBy(() -> almacen.leer("a.jpg"))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void leer_conClavesIncorrectas_avisaQueNoEstaDisponible() {
        when(cliente.getObjectAsBytes(any(GetObjectRequest.class))).thenThrow(errorS3("AccessDenied", 403));

        assertThatThrownBy(() -> almacen.leer("a.jpg"))
                .isInstanceOf(AlmacenNoDisponibleException.class);
    }

    @Test
    void leer_sinConexion_avisaQueNoEstaDisponible() {
        when(cliente.getObjectAsBytes(any(GetObjectRequest.class)))
                .thenThrow(SdkClientException.create("Connection refused"));

        assertThatThrownBy(() -> almacen.leer("a.jpg"))
                .isInstanceOf(AlmacenNoDisponibleException.class);
    }

    // ---------- borrar ----------

    @Test
    void borrar_borraLaFotoDelBucket() {
        almacen.borrar("a.jpg");

        ArgumentCaptor<DeleteObjectRequest> pedido = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(cliente).deleteObject(pedido.capture());
        assertThat(pedido.getValue().bucket()).isEqualTo("faro-fotos");
        assertThat(pedido.getValue().key()).isEqualTo("a.jpg");
    }

    @Test
    void borrar_sinBucketTodavia_noHaceNada() {
        when(cliente.deleteObject(any(DeleteObjectRequest.class))).thenThrow(errorS3("NoSuchBucket", 404));

        almacen.borrar("a.jpg"); // no tira error

        verify(cliente).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void borrar_conClavesIncorrectas_avisaQueNoEstaDisponible() {
        when(cliente.deleteObject(any(DeleteObjectRequest.class))).thenThrow(errorS3("AccessDenied", 403));

        assertThatThrownBy(() -> almacen.borrar("a.jpg"))
                .isInstanceOf(AlmacenNoDisponibleException.class);
    }

    @Test
    void borrar_sinConexion_avisaQueNoEstaDisponible() {
        when(cliente.deleteObject(any(DeleteObjectRequest.class)))
                .thenThrow(SdkClientException.create("Connection refused"));

        assertThatThrownBy(() -> almacen.borrar("a.jpg"))
                .isInstanceOf(AlmacenNoDisponibleException.class);
    }

    // ---------- apagar ----------

    @Test
    void close_cierraElCliente() {
        almacen.close();

        verify(cliente).close();
    }
}
