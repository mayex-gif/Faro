import { useState } from 'react'
import { etiquetaPeriodo, marcasEje } from '../utils/reportes'

const SERIES = [
  { clave: 'otsCreadas', nombre: 'Creadas', clase: 'serie-creadas' },
  { clave: 'otsCerradas', nombre: 'Cerradas', clase: 'serie-cerradas' },
]

// Órdenes creadas y cerradas en cada día, semana o mes del período: barras agrupadas sobre un único eje.
// Al pasar el mouse por un período aparece el detalle. Con teclado o lector de pantalla, los mismos datos
// están escritos en la tabla "Ver los datos en una tabla" que acompaña al gráfico.
function GraficoEvolucion({ serie }) {
  const [activo, setActivo] = useState(null)

  if (serie.length === 0) {
    return <p className="barras-vacio">No se crearon ni cerraron órdenes en este período.</p>
  }

  const maximo = Math.max(...serie.flatMap((punto) => SERIES.map((s) => punto[s.clave])))
  const marcas = marcasEje(maximo)
  const tope = marcas[marcas.length - 1]
  // Con muchos períodos (ej. 31 días) no entran todas las etiquetas: se escribe una cada tantas.
  const cadaCuantas = Math.ceil(serie.length / 12)
  const totalCreadas = serie.reduce((suma, punto) => suma + punto.otsCreadas, 0)
  const totalCerradas = serie.reduce((suma, punto) => suma + punto.otsCerradas, 0)
  const resumen = `Evolución en ${serie.length} períodos: ${totalCreadas} órdenes creadas y ${totalCerradas} cerradas.`

  return (
    <div className="grafico-evolucion">
      <ul className="leyenda-grafico" aria-label="Referencias">
        {SERIES.map((s) => (
          <li key={s.clave}><span className={`muestra-serie ${s.clase}`} aria-hidden="true" />{s.nombre}</li>
        ))}
      </ul>

      <div className="grafico-desplazable" tabIndex={0} aria-label="Gráfico de evolución (se puede deslizar)">
        <div className="grafico-area" role="img" aria-label={resumen}
          style={{ '--cantidad-periodos': serie.length }} onMouseLeave={() => setActivo(null)}>
          <div className="grafico-eje" aria-hidden="true">
            {marcas.map((marca) => (
              <span key={marca} className="grafico-linea" style={{ bottom: `${(marca / tope) * 100}%` }}>
                <span className="grafico-marca">{marca}</span>
              </span>
            ))}
          </div>

          <ol className="grafico-columnas" aria-hidden="true">
            {serie.map((punto, indice) => (
              <li key={punto.periodo} className={activo === indice ? 'grafico-grupo grafico-grupo-activo' : 'grafico-grupo'}
                onMouseEnter={() => setActivo(indice)}>
                <span className="grafico-barras">
                  {SERIES.map((s) => (
                    <span key={s.clave} className={`grafico-barra ${s.clase}`}
                      style={{ height: `${(punto[s.clave] / tope) * 100}%` }} />
                  ))}
                </span>
                <span className="grafico-periodo">
                  {indice % cadaCuantas === 0 ? etiquetaPeriodo(punto.periodo) : ''}
                </span>
                {activo === indice && (
                  <span className={indice > serie.length / 2 ? 'grafico-globo grafico-globo-izquierda' : 'grafico-globo'}>
                    <strong>{etiquetaPeriodo(punto.periodo, { larga: true })}</strong>
                    {SERIES.map((s) => (
                      <span key={s.clave}><span className={`muestra-serie ${s.clase}`} />{s.nombre}: {punto[s.clave]}</span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <details className="datos-grafico">
        <summary>Ver los datos en una tabla</summary>
        <div className="tabla-contenedor" tabIndex={0}>
          <table className="tabla tabla-evolucion">
            <caption className="solo-lectores">Órdenes creadas y cerradas por período</caption>
            <thead>
              <tr><th scope="col">Período</th><th scope="col">Creadas</th><th scope="col">Cerradas</th></tr>
            </thead>
            <tbody>
              {serie.map((punto) => (
                <tr key={punto.periodo}>
                  <th scope="row">{etiquetaPeriodo(punto.periodo, { larga: true })}</th>
                  <td>{punto.otsCreadas}</td>
                  <td>{punto.otsCerradas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

export default GraficoEvolucion
