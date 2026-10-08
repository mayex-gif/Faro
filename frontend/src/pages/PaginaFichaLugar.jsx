import { useEffect, useState } from 'react'
import { listarOrdenes } from '../api/ordenesTrabajo'
import { listarEstados } from '../api/estadosOrden'
import { listarPuntos } from '../api/infraestructura'
import LineaDeTiempo from '../components/LineaDeTiempo'
import Icono from '../components/Icono'
import { describirUbicacion, etiquetaTipoLugar, textoEstadoOperativo } from '../utils/lugares'
import { lineaDeTiempo, resumenDeHistorial } from '../utils/historial'
import '../estilos-ficha.css'

const VISTAS = [
  { valor: 'todas', etiqueta: 'Todos' },
  { valor: 'abiertas', etiqueta: 'Abiertos' },
  { valor: 'cerradas', etiqueta: 'Cerrados' },
]

// params.lugarId llega cuando se entra desde el mapa, Infraestructura o Mis tareas; si no, se elige acá.
function PaginaFichaLugar({ params }) {
  const [lugares, setLugares] = useState([])
  const [cargandoLugares, setCargandoLugares] = useState(true)
  const [errorLugares, setErrorLugares] = useState(null)
  const [estados, setEstados] = useState([])
  const [lugarId, setLugarId] = useState(params?.lugarId != null ? String(params.lugarId) : '')
  // { lugarId, ordenes } o { lugarId, error: true }. Mientras no coincida con el lugar elegido, se está cargando.
  const [historial, setHistorial] = useState(null)
  const [intento, setIntento] = useState(0)
  const [vista, setVista] = useState('todas')

  function cargarLugares() {
    return listarPuntos()
      .then((datos) => {
        setLugares([...datos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
        setErrorLugares(null)
      })
      .catch((e) => {
        console.error(e)
        setErrorLugares('No pudimos cargar los lugares. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargandoLugares(false))
  }

  function recargarLugares() {
    setCargandoLugares(true)
    cargarLugares()
  }

  useEffect(() => {
    cargarLugares()
    listarEstados()
      .then(setEstados)
      .catch((e) => console.error(e)) // sin estados, la línea de tiempo igual muestra cada orden con su estado
  }, [])

  // Las órdenes del lugar elegido. "cancelado" evita mostrar datos de un lugar anterior si se cambia rápido.
  useEffect(() => {
    if (!lugarId) return
    let cancelado = false
    listarOrdenes(lugarId)
      .then((ordenes) => { if (!cancelado) setHistorial({ lugarId, ordenes }) })
      .catch((e) => {
        console.error(e)
        if (!cancelado) setHistorial({ lugarId, error: true })
      })
    return () => { cancelado = true }
  }, [lugarId, intento])

  function reintentar() {
    setHistorial(null)
    setIntento((n) => n + 1)
  }

  const lugar = lugares.find((l) => String(l.id) === lugarId)
  const cargandoHistorial = lugarId !== '' && historial?.lugarId !== lugarId
  const ordenes = historial?.lugarId === lugarId ? historial.ordenes : undefined
  const errorHistorial = historial?.lugarId === lugarId && historial.error
  const items = ordenes ? lineaDeTiempo(ordenes, estados, vista) : []
  const resumen = ordenes ? resumenDeHistorial(ordenes, estados) : null

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">HISTORIA DE LOS LUGARES</p>
        <h1>Ficha histórica del lugar</h1>
        <p>Consultá todo lo que se hizo en un lugar, desde lo más reciente a lo más antiguo.</p>
      </div>

      <section className="panel listado panel-cuadrillas" aria-labelledby="titulo-elegir-lugar" aria-busy={cargandoLugares}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-elegir-lugar">Lugar</h2>
            <p>Elegí el lugar que querés consultar.</p>
          </div>
        </div>

        {errorLugares && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{errorLugares}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargarLugares}>
              Volver a cargar
            </button>
          </div>
        )}

        <div className="selector-cuadrilla">
          <div className="campo">
            <label htmlFor="ficha-lugar">Lugar</label>
            <select id="ficha-lugar" value={lugar ? lugarId : ''} disabled={cargandoLugares || lugares.length === 0}
              onChange={(evento) => { setLugarId(evento.target.value); setVista('todas') }}>
              <option value="">{cargandoLugares ? 'Cargando lugares…' : 'Elegir lugar'}</option>
              {lugares.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre} ({etiquetaTipoLugar(l.tipo)})</option>
              ))}
            </select>
            {!cargandoLugares && !errorLugares && lugares.length === 0 && (
              <p className="ayuda-campo">Todavía no hay lugares registrados. Registralos en Infraestructura.</p>
            )}
          </div>
        </div>
      </section>

      {!lugar && !cargandoLugares && !errorLugares && lugares.length > 0 && (
        <section className="panel listado">
          <div className="estado-listado estado-vacio">
            <span className="icono-vacio"><Icono nombre="historial" /></span>
            <h3>{lugarId ? 'No encontramos ese lugar' : 'Elegí un lugar'}</h3>
            <p>{lugarId ? 'Puede que se haya borrado. Elegí otro de la lista.' : 'Vas a ver sus datos y la historia de los trabajos que se hicieron.'}</p>
          </div>
        </section>
      )}

      {lugar && (
        <>
          <section className="panel listado ficha-datos" aria-labelledby="titulo-datos-lugar">
            <div className="panel-encabezado">
              <div>
                <h2 id="titulo-datos-lugar">{lugar.nombre}</h2>
                <p>Datos del lugar</p>
              </div>
              {resumen && (
                <span className="contador" role="status" aria-atomic="true">
                  {resumen.total} {resumen.total === 1 ? 'trabajo' : 'trabajos'}: {resumen.abiertas} {resumen.abiertas === 1 ? 'abierto' : 'abiertos'}, {resumen.cerradas} {resumen.cerradas === 1 ? 'cerrado' : 'cerrados'}
                </span>
              )}
            </div>
            <dl className="ficha-lista">
              <div><dt>Tipo</dt><dd><span className="tipo-lugar">{etiquetaTipoLugar(lugar.tipo)}</span></dd></div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <span className={lugar.estadoOperativo ? 'estado estado-ok' : 'estado estado-falla'}>
                    <span className="estado-punto" aria-hidden="true" />
                    {textoEstadoOperativo(lugar.estadoOperativo)}
                  </span>
                </dd>
              </div>
              <div><dt>Datos técnicos</dt><dd>{lugar.datosTecnicos || 'Sin datos técnicos'}</dd></div>
              <div><dt>Ubicación</dt><dd className="ubicacion-tabla">{describirUbicacion(lugar.ubicacion)}</dd></div>
            </dl>
          </section>

          <section className="panel listado" aria-labelledby="titulo-historial" aria-busy={cargandoHistorial}>
            <div className="panel-encabezado">
              <div>
                <h2 id="titulo-historial">Historial de trabajos</h2>
                <p>Lo más reciente, primero.</p>
              </div>
              {ordenes && ordenes.length > 0 && (
                <fieldset className="opciones-radio">
                  <legend>Mostrar</legend>
                  {VISTAS.map((opcion) => (
                    <label key={opcion.valor}>
                      <input type="radio" name="vista-historial" value={opcion.valor}
                        checked={vista === opcion.valor} onChange={() => setVista(opcion.valor)} />
                      {opcion.etiqueta}
                    </label>
                  ))}
                </fieldset>
              )}
            </div>

            {errorHistorial && (
              <div className="mensaje mensaje-error" role="alert">
                <div><strong>No se pudo completar la operación</strong><p>No pudimos cargar el historial de este lugar. Revisá la conexión e intentá nuevamente.</p></div>
                <button type="button" className="boton boton-secundario" onClick={reintentar}>
                  Volver a cargar
                </button>
              </div>
            )}

            {cargandoHistorial && (
              <div className="estado-listado" role="status">
                <span className="indicador-carga" aria-hidden="true" />
                <p>Cargando historial…</p>
              </div>
            )}

            {ordenes && ordenes.length === 0 && (
              <div className="estado-listado estado-vacio">
                <span className="icono-vacio"><Icono nombre="historial" /></span>
                <h3>Este lugar todavía no tiene trabajos</h3>
                <p>Cuando se registre una orden de trabajo para este lugar, va a aparecer acá.</p>
              </div>
            )}

            {ordenes && ordenes.length > 0 && items.length === 0 && (
              <div className="estado-listado estado-vacio">
                <h3>No hay trabajos {vista === 'abiertas' ? 'abiertos' : 'cerrados'} en este lugar</h3>
                <button type="button" className="boton boton-secundario" onClick={() => setVista('todas')}>
                  Ver todos los trabajos
                </button>
              </div>
            )}

            {items.length > 0 && <LineaDeTiempo items={items} />}
          </section>
        </>
      )}
    </>
  )
}

export default PaginaFichaLugar
