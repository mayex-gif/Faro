import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COLORES, COLORES_LUMINARIAS, otsPorLuminaria, pesos, textoCantidadesLuminarias } from '../utils/reportes'
import TablaDatosGrafico from './TablaDatosGrafico'

// Las dos series del gráfico "Cómo están hoy". "Sin marcar" no va en el gráfico (va en los números y en la tabla).
const SERIES = [
  { clave: 'nueva', nombre: 'Nuevas', color: COLORES_LUMINARIAS.nueva },
  { clave: 'vieja', nombre: 'Viejas', color: COLORES_LUMINARIAS.vieja },
]

// Sección "Luminarias: nuevas y viejas" de Reportes (la pidió el intendente para ver cómo rinden las LED nuevas).
// - Arriba: cuántas hay de cada una, con su parte del total (las a futuro también).
// - "Cómo están hoy": barras de Funcionan / Apagadas / En arreglo, nuevas al lado de viejas (no depende del período).
// - "En el período": OT creadas y gasto de las OT finalizadas de cada grupo, y OT por luminaria para comparar
//   grupos de distinto tamaño.
// resumen: utils/reportes.js → resumenLuminarias(tablero) (ya calculado; si es null, la página no muestra la sección)
function SeccionLuminarias({ resumen }) {
  const { grupos, tarjetas, estados } = resumen
  const textoGrafico = `Cómo están hoy. ${estados.map((e) => `${e.nombre}: ${e.nueva} nuevas y ${e.vieja} viejas`).join('; ')}.`

  return (
    <section className="panel panel-reporte seccion-luminarias" aria-labelledby="titulo-luminarias-reporte">
      <div className="panel-encabezado">
        <div>
          <h2 id="titulo-luminarias-reporte">Luminarias: nuevas y viejas</h2>
          <p>Cuántas hay y cómo están hoy; abajo, las órdenes y lo gastado en el período elegido.</p>
        </div>
      </div>

      <div className="luminarias-reporte-cuerpo">
        <ul className="indicadores indicadores-luminarias" aria-label={`Luminarias cargadas: ${textoCantidadesLuminarias(resumen)}`}>
          {tarjetas.map((tarjeta) => (
            <li key={tarjeta.clave}>
              <span className="indicador-nombre">
                {COLORES_LUMINARIAS[tarjeta.clave] && (
                  <span className="muestra-serie" style={{ background: COLORES_LUMINARIAS[tarjeta.clave] }} aria-hidden="true" />
                )}
                {tarjeta.nombre}
              </span>
              <strong className="indicador-valor">{tarjeta.cantidad}</strong>
              <span className="indicador-detalle">{tarjeta.porcentaje}% de {resumen.total}</span>
            </li>
          ))}
        </ul>

        <div className="luminarias-reporte-columnas">
          <div>
            <h3>Cómo están hoy</h3>
            <div className="grafico-ranking">
              <ul className="leyenda-grafico" aria-label="Referencias">
                {SERIES.map((s) => (
                  <li key={s.clave}><span className="muestra-serie" style={{ background: s.color }} aria-hidden="true" />{s.nombre}</li>
                ))}
              </ul>
              <div className="grafico-lienzo" role="img" aria-label={textoGrafico}>
                <ResponsiveContainer width="100%" height={230}>
                  {/* barGap 2: 2 px de separación entre la barra de las nuevas y la de las viejas */}
                  <BarChart data={estados} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} accessibilityLayer={false} barGap={2}>
                    <CartesianGrid vertical={false} stroke={COLORES.grilla} />
                    <XAxis dataKey="nombre" tickLine={false} axisLine={{ stroke: COLORES.grilla }} tick={{ fill: COLORES.eje, fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: COLORES.eje, fontSize: 11 }} width={36} />
                    <Tooltip cursor={{ fill: 'rgb(20 61 72 / 6%)' }} content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const fila = payload[0].payload
                      return <div className="grafico-globo">
                        <strong>{fila.nombre}</strong>
                        {SERIES.map((s) => (
                          <span key={s.clave}>
                            <span className="muestra-serie" style={{ background: s.color }} aria-hidden="true" />{s.nombre}: {fila[s.clave]}
                          </span>
                        ))}
                      </div>
                    }} />
                    {/* Puntas de arriba redondeadas (4 px), apoyadas en la línea de base */}
                    {SERIES.map((s) => (
                      <Bar key={s.clave} dataKey={s.clave} name={s.nombre} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <TablaDatosGrafico titulo="Cómo están hoy las luminarias" columnas={['Estado', ...grupos.map((g) => g.nombre)]}
                filas={estados.map((estado) => ({
                  clave: estado.clave,
                  celdas: [estado.nombre, ...grupos.map((g) => estado[g.clave])],
                }))} />
            </div>
          </div>

          <div>
            <h3>En el período</h3>
            <div className="tabla-contenedor" tabIndex={0}>
              <table className="tabla tabla-luminarias-periodo">
                <caption className="solo-lectores">Órdenes y gasto del período, por grupo de luminarias</caption>
                <thead>
                  <tr>
                    <th scope="col">Grupo</th>
                    <th scope="col">Órdenes creadas</th>
                    <th scope="col">Por luminaria</th>
                    <th scope="col">Gastado</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((grupo) => (
                    <tr key={grupo.clave}>
                      <th scope="row">
                        {COLORES_LUMINARIAS[grupo.clave] && (
                          <span className="muestra-serie" style={{ background: COLORES_LUMINARIAS[grupo.clave] }} aria-hidden="true" />
                        )}
                        {grupo.nombre} <span className="tabla-detalle">({grupo.cantidad})</span>
                      </th>
                      <td>{grupo.otsDelPeriodo}</td>
                      <td>{otsPorLuminaria(grupo)}</td>
                      <td>{pesos(grupo.gastoDelPeriodo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nota-luminarias">
              “Por luminaria” sirve para comparar grupos de distinto tamaño. Lo gastado es de las órdenes finalizadas
              (si no se cargó el gasto real, cuenta lo declarado). Cada orden cuenta en el grupo que la luminaria tiene hoy.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SeccionLuminarias
