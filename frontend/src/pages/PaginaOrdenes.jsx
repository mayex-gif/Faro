import { useEffect, useState } from 'react'
import { listarOrdenes } from '../api/ordenesTrabajo'
import TablaOrdenes from '../components/TablaOrdenes'

function PaginaOrdenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  function cargarOrdenes() {
    return listarOrdenes()
      .then((datos) => {
        setOrdenes(datos)
        setError(null)
      })
      .catch((e) => {
        console.error(e)
        setError('No pudimos cargar las órdenes de trabajo. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargando(false))
  }

  function recargarOrdenes() {
    setCargando(true)
    cargarOrdenes()
  }

  useEffect(() => {
    cargarOrdenes()
  }, [])

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">TRABAJOS DEL CORRALÓN</p>
        <h1>Órdenes de trabajo</h1>
        <p>Registrá los trabajos a realizar en cada lugar del pueblo: de dónde surgen, de qué tipo son y qué tan urgentes.</p>
      </div>

      <section className="panel listado" aria-labelledby="titulo-listado-ordenes" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado-ordenes">Órdenes registradas</h2>
            <p>De la más reciente a la más antigua.</p>
          </div>
          {!cargando && !error && (
            <span className="contador">
              {ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'}
            </span>
          )}
        </div>

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargarOrdenes}>
              Volver a cargar
            </button>
          </div>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando órdenes…</p>
          </div>
        ) : (
          <TablaOrdenes ordenes={ordenes} errorCarga={Boolean(error)} />
        )}
      </section>
    </>
  )
}

export default PaginaOrdenes