import { ATAJOS, GRANULARIDADES, esPersonalizado, granularidadSugerida } from '../utils/reportes'

// Período del Panel de Reportes: un período rápido (Hoy, Esta semana…) u "Otras fechas" con desde/hasta,
// y cómo agrupar el gráfico de evolución. Cada cambio vuelve a pedir los datos (lo decide PaginaReportes).
// rangoActual: { desde, hasta } que se está mostrando. Al pasar a "Otras fechas" las fechas arrancan con ese
// rango (así no aparece un error antes de que el usuario haga algo) y se ajustan desde ahí.
function SelectorPeriodo({ periodo, error, rangoActual, onCambiar }) {
  const personalizado = esPersonalizado(periodo)

  function elegirAtajo(atajo) {
    const fechas = atajo === 'PERSONALIZADO' && !periodo.desde && !periodo.hasta && rangoActual
      ? { desde: rangoActual.desde, hasta: rangoActual.hasta }
      : {}
    onCambiar({ ...periodo, ...fechas, atajo, granularidad: granularidadSugerida(atajo) })
  }

  return (
    <div className="selector-periodo">
      <fieldset className="segmentos">
        <legend>Período</legend>
        <div className="segmentos-opciones">
          {ATAJOS.map((opcion) => (
            <label key={opcion.valor} className="segmento">
              <input type="radio" name="periodo-reporte" value={opcion.valor}
                checked={periodo.atajo === opcion.valor} onChange={() => elegirAtajo(opcion.valor)} />
              <span>{opcion.etiqueta}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="campos campos-periodo">
        {personalizado && (
          <>
            <div className="campo">
              <label htmlFor="reporte-desde">Desde</label>
              <input id="reporte-desde" type="date" value={periodo.desde} max={periodo.hasta || undefined}
                aria-invalid={error ? true : undefined} aria-describedby={error ? 'error-periodo' : undefined}
                onChange={(evento) => onCambiar({ ...periodo, desde: evento.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="reporte-hasta">Hasta</label>
              <input id="reporte-hasta" type="date" value={periodo.hasta} min={periodo.desde || undefined}
                aria-invalid={error ? true : undefined} aria-describedby={error ? 'error-periodo' : undefined}
                onChange={(evento) => onCambiar({ ...periodo, hasta: evento.target.value })} />
            </div>
          </>
        )}
        <div className="campo">
          <label htmlFor="reporte-granularidad">Agrupar la evolución</label>
          <select id="reporte-granularidad" value={periodo.granularidad}
            onChange={(evento) => onCambiar({ ...periodo, granularidad: evento.target.value })}>
            {GRANULARIDADES.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="error-campo" id="error-periodo" role="alert">{error}</p>}
    </div>
  )
}

export default SelectorPeriodo
