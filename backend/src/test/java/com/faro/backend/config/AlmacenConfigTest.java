package com.faro.backend.config;

import com.faro.backend.services.AlmacenArchivos;
import com.faro.backend.services.AlmacenS3;
import com.faro.backend.services.AlmacenSinConfigurar;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import static org.assertj.core.api.Assertions.assertThat;

/** Qué almacén arma Spring según las variables FARO_S3_*. Ninguno de estos tests se conecta a nada. */
class AlmacenConfigTest {

    private final AlmacenConfig config = new AlmacenConfig();

    @Test
    void sinClaves_usaElAlmacenSinConfigurar() {
        AlmacenArchivos almacen = config.almacenArchivos("http://localhost:9000", "us-east-1", "faro-fotos", "", "", true);

        assertThat(almacen).isInstanceOf(AlmacenSinConfigurar.class);
    }

    @Test
    void conUnaSolaClave_usaElAlmacenSinConfigurar() {
        AlmacenArchivos almacen = config.almacenArchivos("http://localhost:9000", "us-east-1", "faro-fotos", "usuario", " ", true);

        assertThat(almacen).isInstanceOf(AlmacenSinConfigurar.class);
    }

    @Test
    void conLasDosClaves_usaElAlmacenS3() throws Exception {
        AlmacenArchivos almacen = config.almacenArchivos("http://localhost:9000", "us-east-1", "faro-fotos", "usuario", "clave-de-prueba", true);

        assertThat(almacen).isInstanceOf(AlmacenS3.class);
        ((AlmacenS3) almacen).close();
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
}
