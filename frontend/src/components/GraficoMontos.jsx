import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORES_MONTOS, pesos, pesosConSigno, serieMontos } from '../utils/reportes'
import TablaDatosGrafico from './TablaDatosGrafico'

const SERIES = [
  { clave: 'declarado', nombre: 'Monto aproximado declarado', color: COLORES_MONTOS.declarado },
  { clave: 'gastado', nombre: 'Gasto real', color: COLORES_MONTOS.gastado },
]

// Lo gastado en las órdenes finalizadas de cada día, semana o mes: DOS barras por período, una al lado de la otra:
// lo declarado al crear las OT (monto aproximado, verde) y lo que se gastó en total al finalizarlas (gasto real, naranja).
// Van una al lado de la otra (no apiladas) porque se puede haber gastado menos de lo declarado.
// Al pasar el mouse o tocar un período aparece el detalle, con la diferencia. Para teclado y lector de pantalla,
// los mismos números están en "Ver los datos en una tabla", debajo del gráfico.
function GraficoMontos({ serie }) {
  const datos = serieMontos(serie ?? [])
  if (!datos.some((punto) => punto.declarado > 0 || punto.gastado > 0)) {
    return <p className="barras-vacio">No se informaron montos en este período.</p>
  }
  const declarado = datos.reduce((suma, punto) => suma + punto.declarado, 0)
  const gastado = datos.reduce((suma, punto) => suma + punto.gastado, 0)
  const resumen = `Montos por período. Declarado: ${pesos(declarado)}. Gastado: ${pesos(gastado)}. Diferencia: ${pesosConSigno(gastado - declarado)}.`
  return <div className="grafico-ranking">
    <ul className="leyenda-grafico" aria-label="Referencias">
      {SERIES.map((s) => (
        <li key={s.clave}><span className="muestra-serie" style={{ background: s.color }} aria-hidden="true" />{s.nombre}</li>
      ))}
    </ul>
    <div className="grafico-lienzo" role="img" aria-label={resumen}>
      <ResponsiveContainer width="100%" height={260}>
        {/* barGap 2: 2 px de separación entre las dos barras de un período */}
        <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} accessibilityLayer={false} barGap={2}>
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
              <span><span className="muestra-serie" style={{ background: COLORES_MONTOS.gastado }} aria-hidden="true" />Gastado: {pesos(punto.gastado)}</span>
              <span>Diferencia: {pesosConSigno(punto.diferencia)}</span>
            </div>
          }} />
          {/* Cada barra con las puntas de arriba redondeadas (4 px) y apoyada en la línea de base */}
          <Bar dataKey="declarado" name="Declarado" fill={COLORES_MONTOS.declarado} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="gastado" name="Gastado" fill={COLORES_MONTOS.gastado} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <TablaDatosGrafico titulo="Montos por período" columnas={['Período', 'Declarado', 'Gastado', 'Diferencia']}
      filas={datos.map((punto) => ({
        clave: punto.periodo,
        celdas: [punto.etiquetaLarga, pesos(punto.declarado), pesos(punto.gastado), pesosConSigno(punto.diferencia)],
      }))} />
  </div>
}

export default GraficoMontos
