import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { COLORES } from '../utils/reportes'

// Dona (Recharts) con una leyenda al lado que escribe nombre, cantidad y %: la leyenda es una lista común,
// así el lector de pantalla lee los números aunque el dibujo quede oculto.
// filas: las arma filasBarras() / filasDesvios() en utils/reportes.js, cada una con su color.
// centro: { valor, texto } opcional, lo que se escribe en el agujero (ej. "75%" / "a tiempo").
function GraficoDona({ filas, titulo, centro, unidad = ['orden', 'órdenes'], mensajeVacio }) {
  if (filas.length === 0) return <p className="barras-vacio">{mensajeVacio}</p>

  return (
    <div className="grafico-dona">
      <div className="dona-lienzo" aria-hidden="true">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart accessibilityLayer={false}>
            <Pie data={filas} dataKey="valor" nameKey="nombre" innerRadius="62%" outerRadius="96%" paddingAngle={filas.length > 1 ? 2 : 0}
              stroke="none" startAngle={90} endAngle={-270}>
              {filas.map((fila) => <Cell key={fila.nombre} fill={fila.color || COLORES.sinColor} />)}
            </Pie>
            <Tooltip content={<GloboDona unidad={unidad} />} />
          </PieChart>
        </ResponsiveContainer>
        {centro && (
          <div className="dona-centro">
            <strong>{centro.valor}</strong>
            <span>{centro.texto}</span>
          </div>
        )}
      </div>

      <ul className="dona-leyenda" aria-label={titulo}>
        {filas.map((fila) => (
          <li key={fila.nombre}>
            <span className="barra-punto" style={{ background: fila.color || COLORES.sinColor }} aria-hidden="true" />
            <span className="dona-nombre">{fila.nombre}</span>
            <span className="barra-valor">
              <strong>{fila.valor}</strong>
              <span className="solo-lectores"> {fila.valor === 1 ? unidad[0] : unidad[1]},</span>
              <span className="barra-parte"> {fila.parte}%<span className="solo-lectores"> del total</span></span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GloboDona({ active, payload, unidad }) {
  if (!active || !payload?.length) return null
  const fila = payload[0].payload
  return (
    <div className="grafico-globo">
      <strong>{fila.nombre}</strong>
      <span>{fila.valor} {fila.valor === 1 ? unidad[0] : unidad[1]} · {fila.parte}%</span>
    </div>
  )
}

export default GraficoDona
