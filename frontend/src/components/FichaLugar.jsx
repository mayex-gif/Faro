import { useEffect, useState } from 'react'
import { obtenerHistoria } from '../api/infraestructura'
import Icono from './Icono'
import LineaDeTiempo from './LineaDeTiempo'
import { contar, filtrarPorVista, nombreTipoLugar, VISTAS_HISTORIA } from '../utils/historia'
import { describirUbicacion } from '../utils/lugares'

// Ficha Histórica de un lugar: sus datos, el resumen de sus órdenes y la línea de tiempo.
// La muestra la página "Ficha histórica" (PaginaFichaLugar) cuando se elige un lugar.
// "lugar" es el que se eligió en la lista: con eso ya se pueden mostrar sus datos mientras carga la historia.
function FichaLugar({ lugar }) {
  const [historia, setHistoria] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  // Cada vez que cambia, se vuelve a pedir la historia (lo usa el botón "Volver a cargar")
  const [intento, setIntento] = useState(0)
  // Qué trabajos mostrar en la línea de tiempo: todos, solo los abiertos o solo los cerrados
  const [vista, setVista] = useState('todas')

  useEffect(() => {
    let vigente = true // si el usuario se va antes de que llegue la respuesta, no se usa
    obtenerHistoria(lugar.id)
      .then((datos) => {
        if (!vigente) return
        setHistoria(datos)
        setError(null)
      })
      .catch((e) => {
        if (!vigente) return
        console.error(e)
        setError(e.estado === 404
          ? 'Este lugar ya no existe. Elegí otro de la lista.'
          : 'No pudimos cargar la historia del lugar. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => { vigente = false }
  }, [lugar.id, intento])

  function recargar() {
    setError(null)
    setCargando(true)
    setIntento((anterior) => anterior + 1)
  }

  // Mientras llega la historia, se muestran los datos que ya venían de la lista de lugares
  const datos = historia ?? lugar
  const eventos = historia ? filtrarPorVista(historia.eventos, vista) : []
  const hayEventos = Boolean(historia) && historia.eventos.length > 0

  return (
    <>
      <section className="panel ficha-datos" aria-labelledby="titulo-datos-lugar">
        <div className="panel-encabezado">
          <div className="titulo-con-icono">
            <span className="icono-panel"><Icono nombre="lugar" /></span>
            <div>
              <h2 id="titulo-datos-lugar">{datos.nombre}</h2>
              <p>Cómo está registrado hoy y cuántas órdenes de trabajo tuvo.</p>
            </div>
          </div>
        </div>

        <dl className="ficha-lista">
          <div>
            <dt>Tipo</dt>
            <dd><span className="tipo-lugar">{nombreTipoLugar(datos.tipo)}</span></dd>
          </div>
          <div>
            <dt>Estado operativo</dt>
            <dd>
              <span className={datos.estadoOperativo ? 'estado estado-ok' : 'estado estado-falla'}>
                <span className="estado-punto" aria-hidden="true" />
                {datos.estadoOperativo ? 'Funciona' : 'Fuera de servicio'}
              </span>
            </dd>
          </div>
          <div>
            <dt>Datos técnicos</dt>
            <dd>{datos.datosTecnicos || 'Sin datos técnicos'}</dd>
          </div>
          <div>
            <dt>Ubicación</dt>
            <dd className="ubicacion-tabla">{describirUbicacion(lugar.ubicacion)}</dd>
          </div>
        </dl>

        {historia && (
          <ul className="resumen-ficha" aria-label="Resumen de órdenes de trabajo">
            <li><strong>{historia.totalOrdenes}</strong>{historia.totalOrdenes === 1 ? 'orden' : 'órdenes'} en total</li>
            <li><strong>{historia.ordenesAbiertas}</strong>{historia.ordenesAbiertas === 1 ? 'abierta' : 'abiertas'}</li>
            <li><strong>{historia.ordenesCerradas}</strong>{historia.ordenesCerradas === 1 ? 'cerrada' : 'cerradas'} (finalizadas o canceladas)</li>
          </ul>
        )}
      </section>

      <section className="panel listado" aria-labelledby="titulo-linea-tiempo" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-linea-tiempo">Línea de tiempo</h2>
            <p>Del evento más reciente al más antiguo.</p>
          </div>
          {hayEventos && !cargando && (
            <fieldset className="opciones-radio">
              <legend>Mostrar</legend>
              {VISTAS_HISTORIA.map((opcion) => (
                <label key={opcion.valor}>
                  <input type="radio" name="vista-historia" value={opcion.valor}
                    checked={vista === opcion.valor} onChange={() => setVista(opcion.valor)} />
                  {opcion.etiqueta}
                </label>
              ))}
            </fieldset>
          )}
          {historia && !cargando && (
            <span className="contador" role="status" aria-atomic="true">{contar(eventos.length, 'evento', 'eventos')}</span>
          )}
        </div>

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo mostrar la historia</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargar}>
              Volver a cargar
            </button>
          </div>
        )}

        {cargando && (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando la historia del lugar…</p>
          </div>
        )}

        {!cargando && historia && !error && (
          hayEventos && eventos.length === 0 ? (
            <div className="estado-listado estado-vacio">
              <h3>No hay trabajos {vista === 'abiertas' ? 'abiertos' : 'cerrados'} en este lugar</h3>
              <button type="button" className="boton boton-secundario" onClick={() => setVista('todas')}>
                Ver todos los trabajos
              </button>
            </div>
          ) : (
            <LineaDeTiempo eventos={eventos} />
          )
        )}
      </section>
    </>
  )
}

export default FichaLugar
