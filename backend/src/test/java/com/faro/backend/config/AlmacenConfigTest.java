package com.faro.backend.config;

import com.faro.backend.services.AlmacenArchivos;
import com.faro.backend.services.AlmacenEnMemoria;
import com.faro.backend.services.AlmacenS3;
import com.faro.backend.services.AlmacenSinConfigurar;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Qué almacén arma Spring según las variables FARO_S3_*. Ninguno de estos tests se conecta a nada. */
class AlmacenConfigTest {

    private final AlmacenConfig config = new AlmacenConfig();

    @Test
    void sinClaves_usaElAlmacenSinConfigurar() {
        AlmacenArchivos almacen = config.almacenArchivos("s3", "http://localhost:9000", "us-east-1", "faro-fotos", "", "", true);

        assertThat(almacen).isInstanceOf(AlmacenSinConfigurar.class);
    }

    @Test
    void conUnaSolaClave_usaElAlmacenSinConfigurar() {
        AlmacenArchivos almacen = config.almacenArchivos("s3", "http://localhost:9000", "us-east-1", "faro-fotos", "usuario", " ", true);

        assertThat(almacen).isInstanceOf(AlmacenSinConfigurar.class);
    }

    @Test
    void conLasDosClaves_usaElAlmacenS3() throws Exception {
        AlmacenArchivos almacen = config.almacenArchivos("s3", "http://localhost:9000", "us-east-1", "faro-fotos", "usuario", "clave-de-prueba", true);

        assertThat(almacen).isInstanceOf(AlmacenS3.class);
        ((AlmacenS3) almacen).close();
    }

    @Test
    void tipoMemoria_usaElAlmacenEnMemoria_yAlmacenaDeVerdad() {
        // Aunque haya claves S3 cargadas, "memoria" manda: es lo que se elige a propósito para desarrollar
        AlmacenArchivos almacen = config.almacenArchivos("memoria", "http://localhost:9000", "us-east-1", "faro-fotos", "usuario", "clave-de-prueba", true);

        assertThat(almacen).isInstanceOf(AlmacenEnMemoria.class);
        almacen.guardar("foto", new byte[]{7, 8}, "image/png");
        assertThat(almacen.leer("foto")).containsExactly(7, 8);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {" MEMORIA ", "Memoria"})
    void tipoMemoria_noDistingueMayusculasNiEspacios(String escrito) {
        assertThat(config.almacenArchivos(escrito, "", "us-east-1", "faro-fotos", "", "", true))
                .isInstanceOf(AlmacenEnMemoria.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  "})
    void tipoVacio_sigueSiendoS3(String escrito) {
        assertThat(config.almacenArchivos(escrito, "", "us-east-1", "faro-fotos", "", "", true))
                .isInstanceOf(AlmacenSinConfigurar.class);
    }

    @Test
    void tipoDesconocido_noFrenaElBackend_ysoloFallanLasFotos() {
        AlmacenArchivos almacen = config.almacenArchivos("memory", "http://localhost:9000", "us-east-1", "faro-fotos", "usuario", "clave-de-prueba", true);

        assertThat(almacen).isInstanceOf(AlmacenSinConfigurar.class);
        assertThatThrownBy(() -> almacen.leer("foto"))
                .hasMessageContaining("FARO_ALMACEN tiene que ser 's3' o 'memoria'");
    }

    @Test
    void crearCliente_usaLaRegionPedida() {
        try (S3Client cliente = AlmacenConfig.crearCliente("https://s3.us-west-004.backblazeb2.com", "us-west-004",
                "usuario", "clave-de-prueba", true)) {
            assertThat(cliente.serviceClientConfiguration().region()).isEqualTo(Region.of("us-west-004"));
            assertThat(cliente.serviceClientConfiguration().endpointOverride())
                    .hasValueSatisfying(uri -> assertThat(uri.toString()).isEqualTo("https://s3.us-west-004.backblazeb2.com"));
        }
    }

    @Test
    void crearCliente_sinEndpoint_usaElDeAws() {
        try (S3Client cliente = AlmacenConfig.crearCliente("", "us-east-1", "usuario", "clave-de-prueba", false)) {
            assertThat(cliente.serviceClientConfiguration().endpointOverride()).isEmpty();
        }
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "s3.us-east-005.backblazeb2.com        | https://s3.us-east-005.backblazeb2.com",
            "'  https://s3.us-east-005.backblazeb2.com/ ' | https://s3.us-east-005.backblazeb2.com",
            "http://localhost:9000                 | http://localhost:9000",
            "http://rustfs:9000//                  | http://rustfs:9000",
    })
    void normalizarEndpoint_completaElEsquemaYSacaLaBarraFinal(String escrito, String esperado) {
        assertThat(AlmacenConfig.normalizarEndpoint(escrito)).isEqualTo(esperado);
    }

    @Test
    void normalizarEndpoint_vacioSigueVacio() {
        assertThat(AlmacenConfig.normalizarEndpoint("  ")).isEmpty();
        assertThat(AlmacenConfig.normalizarEndpoint(null)).isEmpty();
    }

    @Test
    void endpointSinHttps_igualArmaElAlmacenS3() throws Exception {
        // Lo que pasó en Render: el endpoint copiado de B2 sin "https://" frenaba el arranque
        AlmacenArchivos almacen = config.almacenArchivos("s3", "s3.us-east-005.backblazeb2.com", "us-east-005",
                "faro-fotos", "usuario", "clave-de-prueba", true);

        assertThat(almacen).isInstanceOf(AlmacenS3.class);
        ((AlmacenS3) almacen).close();
    }

    @Test
    void endpointQueNoEsUnaDireccion_arrancaSinFotosEnVezDeFallar() {
        AlmacenArchivos almacen = config.almacenArchivos("s3", "https://s3 us-east-005 backblazeb2.com", "us-east-005",
                "faro-fotos", "usuario", "clave-de-prueba", true);

        assertThat(almacen).isInstanceOf(AlmacenSinConfigurar.class);
        assertThatThrownBy(() -> almacen.leer("comentarios/x/0.jpg"))
                .hasMessageContaining("FARO_S3_ENDPOINT");
    }

    @Test
    void clavesConEspaciosPegados_seLimpian() throws Exception {
        AlmacenArchivos almacen = config.almacenArchivos("s3", "http://localhost:9000", " us-east-1 ", " faro-fotos ",
                " usuario ", " clave-de-prueba\n", true);

        assertThat(almacen).isInstanceOf(AlmacenS3.class);
        ((AlmacenS3) almacen).close();
    }
}
