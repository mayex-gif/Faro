import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORES_MONTOS, pesos, serieMontos } from '../utils/reportes'
import TablaDatosGrafico from './TablaDatosGrafico'

const SERIES = [
  { clave: 'declarado', nombre: 'Monto aproximado declarado', color: COLORES_MONTOS.declarado },
  { clave: 'adicional', nombre: 'Gastos adicionales', color: COLORES_MONTOS.adicional },
]

// Lo gastado en las órdenes finalizadas de cada día, semana o mes: una barra por período con dos partes apiladas,
// lo declarado al crear la OT (monto aproximado) y lo que se gastó de más (gasto adicional, al finalizarla).
// Al pasar el mouse o tocar una barra aparece el detalle. Para teclado y lector de pantalla,
// los mismos números están en "Ver los datos en una tabla", debajo del gráfico.
function GraficoMontos({ serie }) {
  const datos = serieMontos(serie ?? [])
  if (!datos.some((punto) => punto.total > 0)) return <p className="barras-vacio">No se informaron montos en este período.</p>
  const declarado = datos.reduce((suma, punto) => suma + punto.declarado, 0)
  const adicional = datos.reduce((suma, punto) => suma + punto.adicional, 0)
  const resumen = `Montos por período. Declarado: ${pesos(declarado)}. Gastos adicionales: ${pesos(adicional)}. Total: ${pesos(declarado + adicional)}.`
  return <div className="grafico-ranking">
    <ul className="leyenda-grafico" aria-label="Referencias">
      {SERIES.map((s) => (
        <li key={s.clave}><span className="muestra-serie" style={{ background: s.color }} aria-hidden="true" />{s.nombre}</li>
      ))}
    </ul>
    <div className="grafico-lienzo" role="img" aria-label={resumen}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="#DCE5E7" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={{ stroke: '#DCE5E7' }} tick={{ fill: '#536A72', fontSize: 11 }}
            interval="preserveStartEnd" minTickGap={14} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#536A72', fontSize: 11 }} width={76}
            tickFormatter={(valor) => `$${Number(valor).toLocaleString('es-AR')}`} />
          <Tooltip cursor={{ fill: 'rgb(20 61 72 / 6%)' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const punto = payload[0].payload
            return <div className="grafico-globo">
              <strong>{punto.etiquetaLarga}</strong>
              <span><span className="muestra-serie" style={{ background: COLORES_MONTOS.declarado }} aria-hidden="true" />Declarado: {pesos(punto.declarado)}</span>
              <span><span className="muestra-serie" style={{ background: COLORES_MONTOS.adicional }} aria-hidden="true" />Adicional: {pesos(punto.adicional)}</span>
              <span>Total: {pesos(punto.total)}</span>
            </div>
          }} />
          {/* Dos partes apiladas, con 2 px de separación (borde del color del fondo); solo la de arriba lleva las puntas redondeadas */}
          <Bar dataKey="declarado" name="Declarado" stackId="montos" fill={COLORES_MONTOS.declarado}
            stroke="#FFFFFF" strokeWidth={2} maxBarSize={42} />
          <Bar dataKey="adicional" name="Adicional" stackId="montos" fill={COLORES_MONTOS.adicional}
            stroke="#FFFFFF" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <TablaDatosGrafico titulo="Montos por período" columnas={['Período', 'Declarado', 'Adicional', 'Total']}
      filas={datos.map((punto) => ({
        clave: punto.periodo,
        celdas: [punto.etiquetaLarga, pesos(punto.declarado), pesos(punto.adicional), pesos(punto.total)],
      }))} />
  </div>
}

export default GraficoMontos
