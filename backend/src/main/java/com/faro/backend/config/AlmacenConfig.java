package com.faro.backend.config;

import com.faro.backend.services.AlmacenArchivos;
import com.faro.backend.services.AlmacenEnMemoria;
import com.faro.backend.services.AlmacenS3;
import com.faro.backend.services.AlmacenSinConfigurar;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;
import java.time.Duration;

/**
 * Arma el almacén de fotos con las properties faro.s3.* (variables FARO_S3_*).
 * - Con las dos claves cargadas: almacén S3 de verdad (RustFS, Backblaze B2, Cloudflare R2...).
 * - FARO_ALMACEN=memoria (solo para desarrollar): AlmacenEnMemoria, sin necesidad de ningún depósito.
 * - Sin claves: AlmacenSinConfigurar (el backend arranca igual; los pedidos de fotos responden 503).
 * - Con alguna variable mal escrita (ej. un endpoint que no es una dirección): también AlmacenSinConfigurar,
 *   con un error en el log que dice qué variable revisar. Las fotos son una parte del sistema:
 *   un error de tipeo en ellas no puede dejar sin backend a todo el resto.
 * Antes se limpian los valores pegados a mano: espacios de más, endpoint sin "https://" o con "/" al final.
 * Crear el cliente NO se conecta a nada: la primera conexión es al guardar o leer una foto.
 */
@Configuration
public class AlmacenConfig {

    private static final Logger log = LoggerFactory.getLogger(AlmacenConfig.class);

    static final String TIPO_S3 = "s3";
    static final String TIPO_MEMORIA = "memoria";

    @Bean
    public AlmacenArchivos almacenArchivos(
            @Value("${faro.almacen.tipo:s3}") String tipo,
            @Value("${faro.s3.endpoint:}") String endpoint,
            @Value("${faro.s3.region:us-east-1}") String region,
            @Value("${faro.s3.bucket:faro-fotos}") String bucket,
            @Value("${faro.s3.access-key:}") String accessKey,
            @Value("${faro.s3.secret-key:}") String secretKey,
            @Value("${faro.s3.path-style:true}") boolean pathStyle) {

        String elegido = tipo == null || tipo.isBlank() ? TIPO_S3 : tipo.trim().toLowerCase();
        if (TIPO_MEMORIA.equals(elegido)) {
            log.warn("Almacén de fotos EN MEMORIA (FARO_ALMACEN=memoria): solo para desarrollar. "
                    + "Las fotos se pierden al reiniciar el backend. En Render no se usa: ahí va S3.");
            return new AlmacenEnMemoria();
        }
        if (!TIPO_S3.equals(elegido)) {
            // Igual que con una variable FARO_S3_* mal escrita: el backend arranca, solo fallan los pedidos con fotos
            log.error("FARO_ALMACEN tiene un valor desconocido ('{}'): los valores válidos son 's3' y 'memoria'. "
                    + "El backend arranca igual, sin fotos.", elegido);
            return new AlmacenSinConfigurar("El almacén de fotos está mal configurado: "
                    + "FARO_ALMACEN tiene que ser 's3' o 'memoria'");
        }

        endpoint = normalizarEndpoint(endpoint);
        region = region == null || region.isBlank() ? "us-east-1" : region.trim();
        bucket = bucket == null || bucket.isBlank() ? "faro-fotos" : bucket.trim();
        accessKey = accessKey == null ? "" : accessKey.trim();
        secretKey = secretKey == null ? "" : secretKey.trim();

        if (accessKey.isBlank() || secretKey.isBlank()) {
            log.warn("Almacén de fotos sin configurar (faltan FARO_S3_ACCESS_KEY / FARO_S3_SECRET_KEY): "
                    + "los pedidos con fotos van a responder 503");
            return new AlmacenSinConfigurar();
        }
        S3Client cliente;
        try {
            cliente = crearCliente(endpoint, region, accessKey, secretKey, pathStyle);
        } catch (RuntimeException e) {
            // Solo se muestran endpoint y región: las claves nunca van al log
            log.error("No se pudo armar el almacén de fotos S3. Revisá FARO_S3_ENDPOINT (ahora '{}') y "
                    + "FARO_S3_REGION (ahora '{}'). El backend arranca igual, sin fotos. Detalle: {}",
                    endpoint, region, e.getMessage());
            return new AlmacenSinConfigurar("El almacén de fotos está mal configurado: revisá las variables "
                    + "FARO_S3_ENDPOINT y FARO_S3_REGION del backend");
        }
        log.info("Almacén de fotos S3: bucket '{}' en {}", bucket, endpoint.isBlank() ? "AWS" : endpoint);
        return new AlmacenS3(cliente, bucket);
    }

    /**
     * Deja el endpoint como lo espera el SDK: sin espacios, con "https://" si no trae
     * ningún esquema (el caso de copiar "s3.us-east-005.backblazeb2.com" de la página de B2)
     * y sin "/" al final. Vacío = usar AWS.
     */
    static String normalizarEndpoint(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            return "";
        }
        String limpio = endpoint.trim();
        if (!limpio.contains("://")) {
            limpio = "https://" + limpio;
        }
        while (limpio.endsWith("/")) {
            limpio = limpio.substring(0, limpio.length() - 1);
        }
        return limpio;
    }

    static S3Client crearCliente(String endpoint, String region, String accessKey, String secretKey,
                                 boolean pathStyle) {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                // Cliente HTTP liviano (el de Java), con tiempos máximos para no colgar un pedido
                .httpClientBuilder(UrlConnectionHttpClient.builder()
                        .connectionTimeout(Duration.ofSeconds(5))
                        .socketTimeout(Duration.ofSeconds(30)))
                // "path style" = http://servidor/bucket/foto (RustFS lo necesita; B2 y R2 lo aceptan)
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(pathStyle).build())
                // Los controles de integridad nuevos de AWS no los entienden todos los proveedores S3:
                // se mandan solo cuando la operación los exige
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED);
        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        return builder.build();
    }
}
