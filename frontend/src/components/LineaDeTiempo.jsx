import { ORIGENES, PRIORIDADES, TIPOS_TRABAJO, etiqueta, formatearFecha } from '../utils/ordenesTrabajo'

// Línea de tiempo de intervenciones de un lugar, de lo más reciente a lo más antiguo.
// Props: items = lo que devuelve lineaDeTiempo() en utils/historial.js
// Las fechas de inicio y fin se muestran solo si el backend las informa (hoy solo guarda la de creación).
function LineaDeTiempo({ items }) {
  return (
    <ol className="linea-tiempo">
      {items.map(({ orden, cerrada, fecha }) => (
        <li key={orden.id} className={cerrada ? 'hito hito-cerrado' : 'hito'} style={{ '--punto': orden.estadoColor }}>
          <div className="hito-cabecera">
            <time dateTime={fecha}>{formatearFecha(fecha)}</time>
            {orden.estadoNombre && (
              <span className="estado" style={{ color: orden.estadoColor, background: `${orden.estadoColor}1A` }}>
                <span className="estado-punto" aria-hidden="true" />
                {orden.estadoNombre}
              </span>
            )}
          </div>
          <h3 className="hito-titulo">{orden.descripcion}</h3>
          <p className="hito-detalle">
            OT #{orden.id} · {etiqueta(TIPOS_TRABAJO, orden.tipo)} · Prioridad {etiqueta(PRIORIDADES, orden.prioridad).toLowerCase()} · {etiqueta(ORIGENES, orden.origen)}
          </p>
          <ul className="hito-eventos">
            <li>Creada: {formatearFecha(orden.fechaCreacion)}</li>
            {orden.fechaInicio && <li>Iniciada: {formatearFecha(orden.fechaInicio)}</li>}
            {orden.fechaFin && <li>Terminada: {formatearFecha(orden.fechaFin)}</li>}
            {orden.cuadrillaNombre && <li>Cuadrilla: {orden.cuadrillaNombre}</li>}
          </ul>
        </li>
      ))}
    </ol>
  )
}

export default LineaDeTiempo
