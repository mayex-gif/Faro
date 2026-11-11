import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { etiquetaPeriodo } from '../utils/reportes'
import TablaDatosGrafico from './TablaDatosGrafico'

const moneda = (valor) => Number(valor ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function GraficoMontos({ serie }) {
  const datos = (serie ?? []).map((punto) => ({
    ...punto,
    monto: Number(punto.montoAproximado ?? 0),
    etiqueta: etiquetaPeriodo(punto.periodo),
    etiquetaLarga: etiquetaPeriodo(punto.periodo, { larga: true }),
  }))
  if (!datos.some((punto) => punto.monto > 0)) return <p className="barras-vacio">No se informaron montos aproximados en este período.</p>
  const total = datos.reduce((suma, punto) => suma + punto.monto, 0)
  return <div className="grafico-ranking">
    <div className="grafico-lienzo" role="img" aria-label={`Montos aproximados por período. Total: ${moneda(total)}.`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="#DCE5E7" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={{ stroke: '#DCE5E7' }} tick={{ fill: '#536A72', fontSize: 11 }}
            interval="preserveStartEnd" minTickGap={14} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#536A72', fontSize: 11 }} width={76}
            tickFormatter={(valor) => `$${Number(valor).toLocaleString('es-AR')}`} />
          <Tooltip content={({ active, payload }) => active && payload?.length
            ? <div className="grafico-globo"><strong>{payload[0].payload.etiquetaLarga}</strong><span>Monto: {moneda(payload[0].value)}</span></div>
            : null} />
          <Bar dataKey="monto" name="Monto aproximado" fill="#287B68" radius={[5, 5, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <TablaDatosGrafico titulo="Monto aproximado por período" columnas={['Período', 'Monto']}
      filas={datos.map((punto) => ({ clave: punto.periodo, celdas: [punto.etiquetaLarga, moneda(punto.monto)] }))} />
  </div>
}

export default GraficoMontos
