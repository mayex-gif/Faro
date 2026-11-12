package com.faro.backend.config;

import com.faro.backend.models.PuntoInfraestructura;
import com.faro.backend.repositories.PuntoInfraestructuraRepository;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Carga todas las calles del pueblo de una vez, para no tener que dibujarlas una por una en el mapa.
 *
 * Las calles salen del archivo datos/calles-estacion-general-paz.geojson (se bajó una sola vez de
 * OpenStreetMap y queda guardado en el repositorio: el backend no se conecta a OpenStreetMap).
 *
 * Reglas:
 * - Se carga una sola vez: si ya hay alguna calle traída de OpenStreetMap, no hace nada. Así, una calle
 *   que el encargado borra a propósito no vuelve a aparecer en el siguiente reinicio.
 * - Si ya hay una calle cargada a mano con el mismo nombre (sin importar tildes ni mayúsculas), no se duplica.
 * - Se apaga con la variable FARO_CARGAR_CALLES=false (los tests la apagan).
 * - Si el archivo falta o está mal, avisa en el log y el backend arranca igual.
 */
@Component
public class InicializadorCalles implements CommandLineRunner {

    static final String TIPO_CALLE = "CALLE";
    /** Marca que llevan en "datos técnicos" las calles cargadas desde el archivo. */
    static final String MARCA_OSM = "OpenStreetMap";
    static final String ARCHIVO_POR_DEFECTO = "datos/calles-estacion-general-paz.geojson";

    private static final Logger log = LoggerFactory.getLogger(InicializadorCalles.class);

    private final PuntoInfraestructuraRepository repositorio;
    private final boolean cargarAlIniciar;
    private final String archivo;

    public InicializadorCalles(PuntoInfraestructuraRepository repositorio,
                               @Value("${faro.calles.cargar-al-iniciar:true}") boolean cargarAlIniciar,
                               @Value("${faro.calles.archivo:" + ARCHIVO_POR_DEFECTO + "}") String archivo) {
        this.repositorio = repositorio;
        this.cargarAlIniciar = cargarAlIniciar;
        this.archivo = archivo;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!cargarAlIniciar) return;

        List<PuntoInfraestructura> callesExistentes = repositorio.findByTipo(TIPO_CALLE);
        boolean yaSeCargaron = callesExistentes.stream()
                .anyMatch(calle -> calle.getDatosTecnicos() != null && calle.getDatosTecnicos().contains(MARCA_OSM));
        if (yaSeCargaron) return;

        List<PuntoInfraestructura> delArchivo;
        try {
            delArchivo = leerArchivo();
        } catch (IOException | ParseException | RuntimeException e) {
            log.warn("No se pudieron cargar las calles del archivo {}: {}", archivo, e.getMessage());
            return;
        }

        Set<String> nombresExistentes = callesExistentes.stream()
                .map(calle -> normalizar(calle.getNombre()))
                .collect(Collectors.toSet());
        List<PuntoInfraestructura> nuevas = delArchivo.stream()
                .filter(calle -> !nombresExistentes.contains(normalizar(calle.getNombre())))
                .toList();

        if (!nuevas.isEmpty()) repositorio.saveAll(nuevas);
        log.info("Calles de OpenStreetMap: se cargaron {} ({} ya estaban cargadas a mano).",
                nuevas.size(), delArchivo.size() - nuevas.size());
    }

    /** Lee el FeatureCollection: cada Feature es una calle con "nombre" y una LineString o MultiLineString. */
    List<PuntoInfraestructura> leerArchivo() throws IOException, ParseException {
        JsonNode raiz;
        try (InputStream entrada = new ClassPathResource(archivo).getInputStream()) {
            raiz = JsonMapper.builder().build().readTree(entrada);
        }
        GeoJsonReader lectorGeoJson = new GeoJsonReader();
        List<PuntoInfraestructura> calles = new ArrayList<>();
        for (JsonNode feature : raiz.path("features")) {
            String nombre = feature.path("properties").path("nombre").asString("").trim();
            if (nombre.isEmpty()) continue;
            Geometry recorrido = lectorGeoJson.read(feature.path("geometry").toString());
            if (!recorrido.getGeometryType().endsWith("LineString")) continue; // solo líneas
            recorrido.setSRID(4326); // GPS, igual que la columna de la base

            PuntoInfraestructura calle = new PuntoInfraestructura();
            calle.setNombre(nombre);
            calle.setTipo(TIPO_CALLE);
            calle.setDatosTecnicos("Recorrido tomado de " + MARCA_OSM + " (© colaboradores de OpenStreetMap, licencia ODbL).");
            calle.setEstadoOperativo(true);
            calle.setInstalada(true);
            calle.setUbicacion(recorrido);
            calles.add(calle);
        }
        return calles;
    }

    /** "Córdoba ", "cordoba" y "CORDOBA" son la misma calle. */
    static String normalizar(String nombre) {
        if (nombre == null) return "";
        return Normalizer.normalize(nombre, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
