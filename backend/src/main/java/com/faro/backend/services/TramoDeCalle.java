package com.faro.backend.services;

import com.faro.backend.exceptions.DatoInvalidoException;
import com.faro.backend.models.PuntoInfraestructura;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.PrecisionModel;

import java.util.Arrays;

/**
 * Reglas del "tramo" de una OT en una calle (qué parte de la calle se trabaja).
 * Analogía: la calle es un tren y el tramo son los vagones donde se trabaja.
 * <ul>
 *   <li>Sin tramo (null) = toda la calle.</li>
 *   <li>Solo las calles (lugares tipo CALLE) pueden tener tramo.</li>
 *   <li>El tramo es una línea (LineString) de al menos 2 puntos distintos.</li>
 *   <li>El tramo tiene que caer sobre la calle (con ~5 m de margen por el dedo y el GPS).</li>
 * </ul>
 * Devuelve el tramo con coordenadas redondeadas a 6 decimales (~10 cm) y en GPS (SRID 4326).
 */
public final class TramoDeCalle {

    /** Margen alrededor de la calle, en grados: 0.00005° ≈ 5 m en Estación General Paz. */
    static final double MARGEN_GRADOS = 0.00005;

    private static final String CAMPO = "tramo";
    private static final GeometryFactory FABRICA = new GeometryFactory(new PrecisionModel(1_000_000), 4326);

    private TramoDeCalle() {
        // solo reglas: no se crean objetos de esta clase
    }

    /**
     * Revisa el tramo que mandó la pantalla para el lugar de la OT.
     * @return el tramo listo para guardar, o null si la OT es de toda la calle
     * @throws DatoInvalidoException (400, campo "tramo") si el tramo no cumple las reglas
     */
    public static LineString validar(Geometry tramo, PuntoInfraestructura lugar) {
        if (tramo == null) {
            return null; // toda la calle
        }
        if (lugar == null || !"CALLE".equalsIgnoreCase(lugar.getTipo())) {
            throw new DatoInvalidoException(CAMPO, "El tramo solo se puede marcar en una calle");
        }
        if (!(tramo instanceof LineString linea)) {
            throw new DatoInvalidoException(CAMPO, "El tramo tiene que ser una línea sobre la calle");
        }
        LineString redondeado = redondear(linea);
        if (redondeado.getNumPoints() < 2 || redondeado.getLength() == 0) {
            throw new DatoInvalidoException(CAMPO, "El tramo necesita un punto de inicio y uno de fin distintos");
        }
        Geometry calle = lugar.getUbicacion();
        if (calle == null || !calle.buffer(MARGEN_GRADOS).covers(redondeado)) {
            throw new DatoInvalidoException(CAMPO, "El tramo tiene que estar sobre la calle " + lugar.getNombre());
        }
        return redondeado;
    }

    // Copia la línea con 6 decimales y SRID 4326 (lo mismo que la columna de la base)
    private static LineString redondear(LineString linea) {
        Coordinate[] coordenadas = Arrays.stream(linea.getCoordinates())
                .map(c -> new Coordinate(redondear(c.x), redondear(c.y)))
                .toArray(Coordinate[]::new);
        return FABRICA.createLineString(coordenadas);
    }

    private static double redondear(double valor) {
        return Math.round(valor * 1_000_000d) / 1_000_000d;
    }
}
