import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORES, altoBarras } from '../utils/reportes'
import TablaDatosGrafico from './TablaDatosGrafico'

// Ranking en barras horizontales (Recharts): nombre a la izquierda, cantidad escrita al final de cada barra.
// filas: las arma filasBarras() en utils/reportes.js (nombre, valor, parte y, si hay, color).
// Todas las barras van del mismo tono porque miden cantidad; el color propio de una fila solo se usa si se pide.
function GraficoBarras({ filas, titulo, unidad = ['orden', 'órdenes'], mensajeVacio, conColores = false }) {
  if (filas.length === 0) return <p className="barras-vacio">{mensajeVacio}</p>

  const total = filas.reduce((suma, fila) => suma + fila.valor, 0)
  const resumen = `${titulo}: ${filas.map((f) => `${f.nombre}, ${f.valor} ${f.valor === 1 ? unidad[0] : unidad[1]}`).join('; ')}.`

  return (
    <div className="grafico-ranking">
      <div className="grafico-lienzo" role="img" aria-label={resumen}>
        <ResponsiveContainer width="100%" height={altoBarras(filas.length)}>
          <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }} barCategoryGap={10}
            accessibilityLayer={false}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="nombre" width={130} tickLine={false} axisLine={false}
              tick={{ fill: '#233A44', fontSize: 13 }} />
            <Tooltip content={<GloboBarras unidad={unidad} />} cursor={{ fill: 'rgb(20 61 72 / 5%)' }} />
            <Bar dataKey="valor" radius={[0, 5, 5, 0]} fill={COLORES.barra} maxBarSize={22} isAnimationActive>
              {conColores && filas.map((fila) => <Cell key={fila.nombre} fill={fila.color || COLORES.sinColor} />)}
              <LabelList dataKey="valor" position="right" offset={8}
                content={(props) => <EtiquetaValor {...props} filas={filas} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TablaDatosGrafico titulo={titulo} columnas={['', 'Cantidad', '% del total']}
        filas={[
          ...filas.map((f) => ({ clave: f.nombre, celdas: [f.nombre, f.valor, `${f.parte}%`] })),
          { clave: 'total', celdas: ['Total', total, '100%'] },
        ]} />
    </div>
  )
}

// "12 · 31%" al final de la barra
function EtiquetaValor({ x, y, width, height, index, filas }) {
  const fila = filas[index]
  if (!fila) return null
  return (
    <text x={x + width + 8} y={y + height / 2} dominantBaseline="central" fontSize={13} fill="#233A44">
      <tspan fontWeight={650}>{fila.valor}</tspan>
      <tspan fill={COLORES.eje} fontSize={11}> · {fila.parte}%</tspan>
    </text>
  )
}

function GloboBarras({ active, payload, unidad }) {
  if (!active || !payload?.length) return null
  const fila = payload[0].payload
  return (
    <div className="grafico-globo">
      <strong>{fila.nombre}</strong>
      <span>{fila.valor} {fila.valor === 1 ? unidad[0] : unidad[1]} · {fila.parte}% del total</span>
    </div>
  )
}

export default GraficoBarras
