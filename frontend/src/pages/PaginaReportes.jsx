import { useEffect, useState } from 'react'
import { descargarDesvios, descargarOrdenesResueltas, obtenerTablero } from '../api/reportes'
import SelectorPeriodo from '../components/SelectorPeriodo'
import GraficoEvolucion from '../components/GraficoEvolucion'
import GraficoMontos from '../components/GraficoMontos'
import GraficoBarras from '../components/GraficoBarras'
import GraficoDona from '../components/GraficoDona'
import Icono from '../components/Icono'
import {
  PERIODO_INICIAL, describirRango, errorPeriodo, filasBarras, filasDesvios, nombreTipoTrabajo, parametrosReporte, porcentaje,
  tableroVacio,
} from '../utils/reportes'
import '../estilos-reportes.css'

// Panel de Reportes e Indicadores (Sprint 4, RF10): cuántas órdenes se crearon y cerraron en un período,
// por estado, tipo de trabajo y cuadrilla, y cómo viene el plan de mantenimiento (planificado vs. ejecutado).
// Lo ve solamente el encargado del corralón (utils/permisos.js → puedeVerReportes); el backend valida lo mismo
// y responde 403 para cualquier otro rol (ver ReporteController.java).
// Los números los calcula el backend; esta pantalla solo los ordena y los dibuja (gráficos con Recharts).
// App.jsx la carga recién cuando se abre (React.lazy): Recharts pesa y el resto de los roles no lo descarga.
function PaginaReportes() {
  const [periodo, setPeriodo] = useState(PERIODO_INICIAL)
  const [tablero, setTablero] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [vez, setVez] = useState(0) // "Volver a cargar" la suma para repetir el mismo pedido
  const [descargando, setDescargando] = useState(null) // 'ordenes' | 'desvios' mientras baja el archivo
  const [errorDescarga, setErrorDescarga] = useState(null)

  const problemaPeriodo = errorPeriodo(periodo)
  const consulta = problemaPeriodo ? null : parametrosReporte(periodo).toString()

  useEffect(() => {
    if (consulta === null) return
    let vigente = true
    obtenerTablero(new URLSearchParams(consulta))
      .then((datos) => {
        if (!vigente) return
        setTablero(datos)
        setError(null)
      })
      .catch((e) => {
        if (!vigente) return
        console.error(e)
        setError(e.estado === 400 ? e.message : 'No pudimos cargar los indicadores. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false } // si se cambia el período antes de que llegue la respuesta, se ignora
  }, [consulta, vez])

  function cambiarPeriodo(nuevo) {
    setPeriodo(nuevo)
    if (!errorPeriodo(nuevo)) setCargando(true)
  }

  function reintentar() {
    setCargando(true)
    setError(null)
    setVez((v) => v + 1)
  }

  async function descargar(cual) {
    setDescargando(cual)
    setErrorDescarga(null)
    try {
      const parametros = parametrosReporte(periodo, { conGranularidad: false })
      const { contenido, nombre } = cual === 'ordenes' ? await descargarOrdenesResueltas(parametros) : await descargarDesvios(parametros)
      const direccion = URL.createObjectURL(contenido)
      const enlace = document.createElement('a')
      enlace.href = direccion
      enlace.download = nombre
      document.body.append(enlace)
      enlace.click()
      enlace.remove()
      setTimeout(() => URL.revokeObjectURL(direccion), 1000)
    } catch (e) {
      console.error(e)
      setErrorDescarga('No se pudo descargar el archivo. Revisá la conexión e intentá nuevamente.')
    } finally {
      setDescargando(null)
    }
  }

  const desvios = tablero?.resumenDesvios
  const finalizadasPlan = desvios ? desvios.aTiempo + desvios.adelantadas + desvios.demoradas : 0

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">INDICADORES</p>
        <h1>Reportes</h1>
        <p>Cuántos trabajos entraron y cuántos se resolvieron, quién los hizo y si el mantenimiento programado se cumple a tiempo.</p>
      </div>

      <section className="panel panel-periodo" aria-labelledby="titulo-periodo">
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-periodo">Qué período mirar</h2>
            <p>{tablero && !cargando && !error ? `Mostrando del ${describirRango(tablero.desde, tablero.hasta)}.` : 'Elegí un período para ver sus números.'}</p>
          </div>
          <div className="botones botones-descarga">
            <button type="button" className="boton boton-secundario" disabled={descargando !== null || problemaPeriodo !== null}
              onClick={() => descargar('ordenes')}>
              <Icono nombre="descargar" />{descargando === 'ordenes' ? 'Descargando…' : 'Trabajos finalizados (CSV)'}
            </button>
            <button type="button" className="boton boton-secundario" disabled={descargando !== null || problemaPeriodo !== null}
              onClick={() => descargar('desvios')}>
              <Icono nombre="descargar" />{descargando === 'desvios' ? 'Descargando…' : 'Desvíos del plan (CSV)'}
            </button>
          </div>
        </div>
        <div className="panel-cuerpo">
          <SelectorPeriodo periodo={periodo} error={problemaPeriodo} onCambiar={cambiarPeriodo}
            rangoActual={tablero ? { desde: tablero.desde, hasta: tablero.hasta } : null} />
          {errorDescarga && (
            <div className="mensaje mensaje-error" role="alert">
              <div><strong>No se pudo descargar</strong><p>{errorDescarga}</p></div>
            </div>
          )}
        </div>
      </section>

      <div className="tablero" aria-busy={cargando}>
        {error && !problemaPeriodo && (
          <div className="mensaje mensaje-error mensaje-tablero" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={reintentar}>Volver a cargar</button>
          </div>
        )}

        {cargando && !problemaPeriodo && (
          <div className="panel estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Calculando indicadores…</p>
          </div>
        )}

        {!cargando && !error && !problemaPeriodo && tablero && (tableroVacio(tablero) ? (
          <div className="panel estado-listado estado-vacio">
            <span className="icono-vacio"><Icono nombre="reportes" /></span>
            <h3>No hubo trabajos en este período.</h3>
            <p>Probá con un período más largo, por ejemplo “Este año”.</p>
          </div>
        ) : (
          <>
            <section aria-labelledby="titulo-totales">
              <h2 id="titulo-totales" className="solo-lectores">Totales del período</h2>
              <ul className="indicadores">
                <li>
                  <span className="indicador-nombre">Órdenes creadas</span>
                  <strong className="indicador-valor">{tablero.totalOts}</strong>
                </li>
                <li>
                  <span className="indicador-nombre">Resueltas</span>
                  <strong className="indicador-valor">{tablero.otsCerradas}</strong>
                  <span className="indicador-detalle">{porcentaje(tablero.otsCerradas, tablero.totalOts)}% de las creadas</span>
                </li>
                <li>
                  <span className="indicador-nombre">Siguen abiertas</span>
                  <strong className="indicador-valor">{tablero.otsPendientes}</strong>
                  <span className="indicador-detalle">pendientes, asignadas o en curso</span>
                </li>
                <li>
                  <span className="indicador-nombre">Monto aproximado de OTs finalizadas</span>
                  <strong className="indicador-valor">{Number(tablero.montoAproximadoTotal ?? 0).toLocaleString('es-AR', {
                    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
                  })}</strong>
                  <span className="indicador-detalle">informado para las órdenes del período</span>
                </li>
                <li>
                  <span className="indicador-nombre">Plan cumplido a tiempo</span>
                  <strong className="indicador-valor">{finalizadasPlan > 0 ? `${Math.round(desvios.porcentajeCumplimiento)}%` : '—'}</strong>
                  <span className="indicador-detalle">
                    {finalizadasPlan > 0 ? `de ${finalizadasPlan} programadas finalizadas` : 'sin programadas finalizadas'}
                  </span>
                </li>
              </ul>
            </section>

            <section className="panel panel-reporte" aria-labelledby="titulo-evolucion">
              <div className="panel-encabezado">
                <div>
                  <h2 id="titulo-evolucion">Evolución</h2>
                  <p>Órdenes creadas y cerradas en cada {({ DIA: 'día', SEMANA: 'semana', MES: 'mes' })[tablero.granularidad] ?? 'período'}.</p>
                </div>
              </div>
              <GraficoEvolucion serie={tablero.otsPorPeriodo ?? []} />
            </section>

            <section className="panel panel-reporte" aria-labelledby="titulo-montos">
              <div className="panel-encabezado">
                <div><h2 id="titulo-montos">Monto aproximado gastado</h2><p>Suma de los montos de las órdenes finalizadas en cada día, semana o mes.</p></div>
              </div>
              <GraficoMontos serie={tablero.montoPorPeriodo ?? []} />
            </section>

            <div className="reportes-columnas">
              <section className="panel panel-reporte" aria-labelledby="titulo-por-estado">
                <div className="panel-encabezado">
                  <div><h2 id="titulo-por-estado">Por estado</h2><p>Dónde están hoy las órdenes creadas en el período.</p></div>
                </div>
                <GraficoDona titulo="Órdenes por estado" mensajeVacio="Sin órdenes en el período."
                  centro={{ valor: tablero.totalOts, texto: tablero.totalOts === 1 ? 'orden' : 'órdenes' }}
                  filas={filasBarras(tablero.otsPorEstado, { nombre: (f) => f.estadoNombre, valor: (f) => f.cantidad, color: (f) => f.estadoColor })} />
              </section>

              <section className="panel panel-reporte" aria-labelledby="titulo-por-tipo">
                <div className="panel-encabezado">
                  <div><h2 id="titulo-por-tipo">Por tipo de trabajo</h2><p>Qué se pidió más.</p></div>
                </div>
                <GraficoBarras titulo="Órdenes por tipo de trabajo" mensajeVacio="Sin órdenes en el período."
                  filas={filasBarras(tablero.otsPorTipoTrabajo, { nombre: (f) => nombreTipoTrabajo(f.tipoTrabajo), valor: (f) => f.cantidad })} />
              </section>

              <section className="panel panel-reporte" aria-labelledby="titulo-por-cuadrilla">
                <div className="panel-encabezado">
                  <div><h2 id="titulo-por-cuadrilla">Por cuadrilla</h2><p>Carga de trabajo de cada cuadrilla.</p></div>
                </div>
                <GraficoBarras titulo="Órdenes por cuadrilla" mensajeVacio="Sin órdenes en el período."
                  filas={filasBarras(tablero.otsPorCuadrilla, { nombre: (f) => f.cuadrillaNombre ?? 'Sin asignar', valor: (f) => f.cantidad })} />
              </section>

              <section className="panel panel-reporte" aria-labelledby="titulo-plan">
                <div className="panel-encabezado">
                  <div><h2 id="titulo-plan">Mantenimiento programado</h2><p>Órdenes del plan con fecha prevista en el período.</p></div>
                </div>
                {desvios.totalConPlanificacion === 0 ? (
                  <p className="barras-vacio">No hubo trabajos programados con fecha en este período.</p>
                ) : (
                  <>
                    <GraficoDona titulo="Órdenes del plan según cómo terminaron" mensajeVacio="" filas={filasDesvios(desvios)}
                      centro={finalizadasPlan > 0
                        ? { valor: `${Math.round(desvios.porcentajeCumplimiento)}%`, texto: 'a tiempo' }
                        : { valor: desvios.totalConPlanificacion, texto: 'programadas' }} />
                    {finalizadasPlan > 0 && (
                      <p className="nota-plan">
                        Desvío promedio: <strong>{formatearDesvioPromedio(desvios.desvioPromedioDias)}</strong>
                      </p>
                    )}
                  </>
                )}
              </section>
            </div>
          </>
        ))}
      </div>
    </>
  )
}

// 1.3 → "1,3 días de demora"; -0.5 → "0,5 días de adelanto"; 0 → "sin desvío"
function formatearDesvioPromedio(dias) {
  if (!dias) return 'sin desvío'
  const valor = Math.abs(dias).toLocaleString('es-AR', { maximumFractionDigits: 1 })
  return `${valor} ${Math.abs(dias) === 1 ? 'día' : 'días'} de ${dias > 0 ? 'demora' : 'adelanto'}`
}

export default PaginaReportes
