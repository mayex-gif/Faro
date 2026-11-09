import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORES, serieEvolucion } from '../utils/reportes'
import TablaDatosGrafico from './TablaDatosGrafico'

const SERIES = [
  { clave: 'otsCreadas', nombre: 'Creadas', color: COLORES.creadas },
  { clave: 'otsCerradas', nombre: 'Cerradas', color: COLORES.cerradas },
]

// Órdenes creadas y cerradas en cada día, semana o mes del período (Recharts: áreas sobre un mismo eje).
// Al pasar el mouse o tocar un período aparece el detalle. Para teclado y lector de pantalla,
// los mismos números están en "Ver los datos en una tabla", debajo del gráfico.
function GraficoEvolucion({ serie }) {
  if (serie.length === 0) {
    return <p className="barras-vacio">No se crearon ni cerraron órdenes en este período.</p>
  }

  const puntos = serieEvolucion(serie)
  const totalCreadas = serie.reduce((suma, punto) => suma + punto.otsCreadas, 0)
  const totalCerradas = serie.reduce((suma, punto) => suma + punto.otsCerradas, 0)
  const resumen = `Evolución en ${serie.length} períodos: ${totalCreadas} órdenes creadas y ${totalCerradas} cerradas.`

  return (
    <div className="grafico-evolucion">
      <ul className="leyenda-grafico" aria-label="Referencias">
        {SERIES.map((s) => (
          <li key={s.clave}><span className="muestra-serie" style={{ background: s.color }} aria-hidden="true" />{s.nombre}</li>
        ))}
      </ul>

      <div className="grafico-lienzo" role="img" aria-label={resumen}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={puntos} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} accessibilityLayer={false}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.clave} id={`relleno-${s.clave}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={COLORES.grilla} />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={{ stroke: COLORES.grilla }} tick={{ fill: COLORES.eje, fontSize: 11 }}
              interval="preserveStartEnd" minTickGap={14} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: COLORES.eje, fontSize: 11 }} width={44} />
            <Tooltip content={<GloboEvolucion />} cursor={{ stroke: COLORES.eje, strokeDasharray: '3 3' }} />
            {SERIES.map((s) => (
              <Area key={s.clave} type="monotone" dataKey={s.clave} name={s.nombre} stroke={s.color} strokeWidth={2.5}
                fill={`url(#relleno-${s.clave})`} dot={puntos.length <= 14 ? { r: 3, fill: s.color, strokeWidth: 0 } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF' }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <TablaDatosGrafico titulo="Órdenes creadas y cerradas por período"
        columnas={['Período', 'Creadas', 'Cerradas']}
        filas={puntos.map((p) => ({ clave: p.periodo, celdas: [p.etiquetaLarga, p.otsCreadas, p.otsCerradas] }))} />
    </div>
  )
}

function GloboEvolucion({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="grafico-globo">
      <strong>{payload[0].payload.etiquetaLarga}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}><span className="muestra-serie" style={{ background: item.color }} />{item.name}: {item.value}</span>
      ))}
    </div>
  )
}

export default GraficoEvolucion
