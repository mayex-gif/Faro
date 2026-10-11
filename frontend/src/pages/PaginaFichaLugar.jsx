import { useEffect, useState } from 'react'
import { listarPuntos } from '../api/infraestructura'
import FichaLugar from '../components/FichaLugar'
import Icono from '../components/Icono'
import { etiquetaTipoLugar } from '../utils/lugares'
import '../estilos-ficha.css'

// Página "Ficha histórica": se elige un lugar y se ve su ficha (datos, resumen y línea de tiempo).
// params.lugarId llega cuando se entra desde el mapa, Infraestructura o Mis tareas; si no, se elige acá.
function PaginaFichaLugar({ params }) {
  const [lugares, setLugares] = useState([])
  const [cargandoLugares, setCargandoLugares] = useState(true)
  const [errorLugares, setErrorLugares] = useState(null)
  const [lugarId, setLugarId] = useState(params?.lugarId != null ? String(params.lugarId) : '')

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
  }, [])

  const lugar = lugares.find((l) => String(l.id) === lugarId)

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">HISTORIA DE LOS LUGARES</p>
        <h1>Ficha histórica del lugar</h1>
        <p>Todo lo que pasó en un lugar: las órdenes de trabajo registradas y cada cambio que tuvieron, desde lo más reciente.</p>
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
              onChange={(evento) => setLugarId(evento.target.value)}>
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

      {/* key: al cambiar de lugar, la ficha arranca de cero (se vuelve a pedir la historia y la vista vuelve a "Todos") */}
      {lugar && <FichaLugar key={lugar.id} lugar={lugar} />}
    </>
  )
}

export default PaginaFichaLugar
