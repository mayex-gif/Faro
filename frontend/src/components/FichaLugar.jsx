import { useEffect, useState } from 'react'
import { obtenerHistoria } from '../api/infraestructura'
import Icono from './Icono'
import LineaDeTiempo from './LineaDeTiempo'
import { contar, nombreTipoLugar } from '../utils/historia'

// Ficha Histórica de un lugar: sus datos, el resumen de sus órdenes y la línea de tiempo.
// "lugar" es la fila que se eligió en la tabla: con eso ya se puede mostrar el título mientras carga.
function FichaLugar({ lugar, onVolver }) {
  const [historia, setHistoria] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  // Cada vez que cambia, se vuelve a pedir la historia (lo usa el botón "Volver a cargar")
  const [intento, setIntento] = useState(0)

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
          ? 'Este lugar ya no existe. Volvé al listado para ver los lugares registrados.'
          : 'No pudimos cargar la historia del lugar. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => { vigente = false }
  }, [lugar.id, intento])

  // Al abrir la ficha, el foco va al título (así un lector de pantalla anuncia en qué lugar estamos)
  useEffect(() => {
    document.getElementById('titulo-ficha')?.focus()
  }, [])

  function recargar() {
    setError(null)
    setCargando(true)
    setIntento((anterior) => anterior + 1)
  }

  // Mientras llega la historia, se muestran los datos que ya venían de la tabla
  const datos = historia ?? lugar

  return (
    <>
      <div className="encabezado-pagina">
        <button type="button" className="boton boton-secundario boton-volver" onClick={onVolver}>
          <Icono nombre="volver" />Volver a lugares
        </button>
        <p className="sobre-titulo">FICHA HISTÓRICA DEL LUGAR</p>
        <h1 id="titulo-ficha" tabIndex={-1}>{datos.nombre}</h1>
        <p>Todo lo que pasó en este lugar: las órdenes de trabajo registradas y cada cambio que tuvieron.</p>
      </div>

      <section className="panel ficha-datos" aria-labelledby="titulo-datos-lugar">
        <div className="panel-encabezado">
          <div className="titulo-con-icono">
            <span className="icono-panel"><Icono nombre="lugar" /></span>
            <div>
              <h2 id="titulo-datos-lugar">Datos del lugar</h2>
              <p>Cómo está registrado hoy y cuántas órdenes de trabajo tuvo.</p>
            </div>
          </div>
        </div>

        <dl className="datos-ficha">
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
          {historia && !cargando && (
            <span className="contador">{contar(historia.eventos.length, 'evento', 'eventos')}</span>
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

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando la historia del lugar…</p>
          </div>
        ) : (
          historia && !error && <LineaDeTiempo eventos={historia.eventos} />
        )}
      </section>
    </>
  )
}

export default FichaLugar