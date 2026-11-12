package com.faro.backend.services;

import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.models.PuntoInfraestructura;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests de las reglas del tramo de calle (sin base de datos ni Spring).
 * Calle de prueba: una recta de oeste a este de ~380 m, sobre la latitud -31.1340.
 */
class TramoDeCalleTest {

    private static final GeometryFactory GPS = new GeometryFactory();

    private static LineString linea(double... longLat) {
        Coordinate[] puntos = new Coordinate[longLat.length / 2];
        for (int i = 0; i < puntos.length; i++) {
            puntos[i] = new Coordinate(longLat[2 * i], longLat[2 * i + 1]);
        }
        return GPS.createLineString(puntos);
    }

    private static PuntoInfraestructura calle() {
        PuntoInfraestructura calle = new PuntoInfraestructura();
        calle.setId(5L);
        calle.setNombre("Buenos Aires");
        calle.setTipo("CALLE");
        calle.setUbicacion(linea(-64.1420, -31.1340, -64.1380, -31.1340));
        return calle;
    }

    @Test
    @DisplayName("Sin tramo = toda la calle: devuelve null")
    void sinTramoEsTodaLaCalle() {
        assertNull(TramoDeCalle.validar(null, calle()));
    }

    @Test
    @DisplayName("Un tramo sobre la calle se acepta, con 6 decimales y SRID 4326")
    void tramoSobreLaCalleSeAceptaRedondeado() {
        LineString tramo = TramoDeCalle.validar(linea(-64.14100004, -31.13400004, -64.1395, -31.1340), calle());

        assertEquals(4326, tramo.getSRID());
        assertEquals(2, tramo.getNumPoints());
        assertEquals(-64.141, tramo.getCoordinateN(0).x, 0);
        assertEquals(-31.134, tramo.getCoordinateN(0).y, 0);
    }

    @Test
    @DisplayName("Un tramo a ~3 m de la calle entra (margen del dedo y del GPS)")
    void tramoApenasCorridoEntraEnElMargen() {
        // 0.00003° de latitud ≈ 3,3 m al sur de la calle
        assertNotNull(TramoDeCalle.validar(linea(-64.1410, -31.13403, -64.1395, -31.13403), calle()));
    }

    @Test
    @DisplayName("Un tramo a ~55 m de la calle se rechaza")
    void tramoFueraDeLaCalleSeRechaza() {
        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> TramoDeCalle.validar(linea(-64.1410, -31.1345, -64.1395, -31.1345), calle()));

        assertEquals("tramo", error.getCampo());
        assertEquals("El tramo tiene que estar sobre la calle Buenos Aires", error.getMessage());
    }

    @Test
    @DisplayName("Un tramo que se pasa del final de la calle se rechaza")
    void tramoQueSePasaDelFinalSeRechaza() {
        assertThrows(DatoInvalidoException.class,
                () -> TramoDeCalle.validar(linea(-64.1390, -31.1340, -64.1370, -31.1340), calle()));
    }

    @Test
    @DisplayName("Un lugar que no es calle no admite tramo")
    void lugarQueNoEsCalleSeRechaza() {
        PuntoInfraestructura plaza = calle();
        plaza.setTipo("ESPACIO_VERDE");

        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> TramoDeCalle.validar(linea(-64.1410, -31.1340, -64.1395, -31.1340), plaza));

        assertEquals("El tramo solo se puede marcar en una calle", error.getMessage());
    }

    @Test
    @DisplayName("Un punto no sirve como tramo: tiene que ser una línea")
    void unPuntoSeRechaza() {
        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> TramoDeCalle.validar(GPS.createPoint(new Coordinate(-64.1400, -31.1340)), calle()));

        assertEquals("El tramo tiene que ser una línea sobre la calle", error.getMessage());
    }

    @Test
    @DisplayName("Inicio y fin en el mismo lugar se rechaza")
    void inicioYFinIgualesSeRechaza() {
        DatoInvalidoException error = assertThrows(DatoInvalidoException.class,
                () -> TramoDeCalle.validar(linea(-64.1400, -31.1340, -64.1400, -31.1340), calle()));

        assertEquals("El tramo necesita un punto de inicio y uno de fin distintos", error.getMessage());
    }

    @Test
    @DisplayName("Un tramo con varios puntos que sigue una calle con curva se acepta")
    void tramoConVariosPuntosSobreCalleConCurva() {
        PuntoInfraestructura conCurva = calle();
        conCurva.setUbicacion(linea(-64.1420, -31.1340, -64.1400, -31.1340, -64.1400, -31.1320));

        LineString tramo = TramoDeCalle.validar(
                linea(-64.1410, -31.1340, -64.1400, -31.1340, -64.1400, -31.1330), conCurva);

        assertEquals(3, tramo.getNumPoints());
    }
}
