import { useEffect, useState } from 'react'
import { cambiarEstadoOrden, listarOrdenes } from '../api/ordenesTrabajo'
import { listarEstados } from '../api/estadosOrden'
import { listarCuadrillas } from '../api/cuadrillas'
import TarjetaTarea from '../components/TarjetaTarea'
import Icono from '../components/Icono'
import { tareasDeCuadrilla } from '../utils/tareas'
import '../estilos-mis-tareas.css'

// Todavía no hay inicio de sesión (llega en el Sprint 3): el capataz elige su cuadrilla y el navegador la recuerda.
const CLAVE_CUADRILLA = 'faro.cuadrillaElegida'

function leerCuadrillaGuardada() {
  try {
    return localStorage.getItem(CLAVE_CUADRILLA) ?? ''
  } catch {
    return '' // el navegador no deja guardar datos: simplemente no se recuerda
  }
}

function guardarCuadrilla(id) {
  try {
    if (id) localStorage.setItem(CLAVE_CUADRILLA, id)
    else localStorage.removeItem(CLAVE_CUADRILLA)
  } catch {
    // sin almacenamiento: la elección vale solo mientras la pantalla esté abierta
  }
}

function PaginaMisTareas({ onNavegar }) {
  const [ordenes, setOrdenes] = useState([])
  const [estados, setEstados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cuadrillas, setCuadrillas] = useState([])
  const [cargandoCuadrillas, setCargandoCuadrillas] = useState(true)
  const [errorCuadrillas, setErrorCuadrillas] = useState(null)
  const [cuadrillaId, setCuadrillaId] = useState(leerCuadrillaGuardada)
  // Id de la tarea que se está guardando (bloquea los botones de las demás mientras tanto)
  const [idGuardando, setIdGuardando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  function cargarOrdenes() {
    // Sin los estados no se sabe qué se puede hacer con cada tarea: si falla uno de los dos pedidos, es un error de carga.
    return Promise.all([listarOrdenes(), listarEstados()])
      .then(([datosOrdenes, datosEstados]) => {
        setOrdenes(datosOrdenes)
        setEstados(datosEstados)
        setError(null)
      })
      .catch((e) => {
        console.error(e)
        setError('No pudimos cargar las tareas. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargando(false))
  }

  function cargarCuadrillas() {
    return listarCuadrillas()
      .then((datos) => {
        setCuadrillas(datos)
        setErrorCuadrillas(null)
      })
      .catch((e) => {
        console.error(e)
        setErrorCuadrillas('No pudimos cargar las cuadrillas. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargandoCuadrillas(false))
  }

  // "Actualizar" vuelve a pedir todo (por ejemplo, para ver tareas recién asignadas).
  function actualizar() {
    setCargando(true)
    setCargandoCuadrillas(true)
    setMensaje('')
    setErrorAccion('')
    cargarOrdenes()
    cargarCuadrillas()
  }

  useEffect(() => {
    cargarOrdenes()
    cargarCuadrillas()
  }, [])

  function elegirCuadrilla(evento) {
    setCuadrillaId(evento.target.value)
    guardarCuadrilla(evento.target.value)
    setMensaje('')
    setErrorAccion('')
  }

  // Solo vale la cuadrilla recordada si todavía existe.
  const cuadrillaActual = cuadrillas.find((cuadrilla) => String(cuadrilla.id) === String(cuadrillaId))
  const tareas = cuadrillaActual ? tareasDeCuadrilla(ordenes, estados, cuadrillaActual.id) : []
  // Mientras el backend no informe a qué cuadrilla pertenece cada OT (CONTRATO_CUADRILLAS.md), no se puede saber cuáles son "mis" tareas.
  const faltaDatoDeCuadrilla = ordenes.length > 0 && !ordenes.some((orden) => 'cuadrillaId' in orden)

  function accion(orden, estadoNuevo) {
    // Finalizada y Cancelada no tienen vuelta atrás: pedimos confirmación
    if (estadoNuevo.cierre) {
      const confirmado = window.confirm(
        `¿Pasar la OT #${orden.id} a "${estadoNuevo.nombre}"? Después ya no se va a poder modificar.`)
      if (!confirmado) return
    }
    setIdGuardando(orden.id)
    setMensaje('')
    setErrorAccion('')
    cambiarEstadoOrden(orden.id, estadoNuevo.id)
      .then((actualizada) => {
        // reemplazamos solo esa OT: si quedó cerrada, deja de figurar entre las tareas
        setOrdenes((anteriores) => anteriores.map((o) => (o.id === actualizada.id ? actualizada : o)))
        setMensaje(`La OT #${actualizada.id} pasó a "${actualizada.estadoNombre}".`)
      })
      .catch((e) => {
        console.error(e)
        // e.message trae el motivo que explica el backend
        setErrorAccion(e.message || 'No se pudo guardar el cambio. Intentá nuevamente.')
      })
      .finally(() => setIdGuardando(null))
  }

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">TRABAJO EN TERRITORIO</p>
        <h1>Mis tareas</h1>
        <p>Elegí tu cuadrilla para ver los trabajos que tenés asignados. Marcá cuándo empezás y cuándo terminás cada uno.</p>
      </div>

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
        {errorAccion && <p className="mensaje mensaje-error" role="alert">{errorAccion}</p>}
      </div>

      <section className="panel listado panel-cuadrillas" aria-labelledby="titulo-mi-cuadrilla" aria-busy={cargandoCuadrillas}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-mi-cuadrilla">Tu cuadrilla</h2>
            <p>Todavía no hay inicio de sesión: elegí la cuadrilla en la que trabajás. El teléfono la recuerda.</p>
          </div>
        </div>

        {errorCuadrillas && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{errorCuadrillas}</p></div>
            <button type="button" className="boton boton-secundario" onClick={actualizar}>
              Volver a cargar
            </button>
          </div>
        )}

        <div className="selector-cuadrilla">
          <div className="campo">
            <label htmlFor="mi-cuadrilla">Cuadrilla</label>
            <select id="mi-cuadrilla" value={cuadrillaActual ? String(cuadrillaActual.id) : ''}
              onChange={elegirCuadrilla} disabled={cargandoCuadrillas || cuadrillas.length === 0}>
              <option value="">{cargandoCuadrillas ? 'Cargando cuadrillas…' : 'Elegir cuadrilla'}</option>
              {cuadrillas.map((cuadrilla) => (
                <option key={cuadrilla.id} value={cuadrilla.id}>{cuadrilla.nombre}</option>
              ))}
            </select>
          </div>
          <button type="button" className="boton boton-secundario" onClick={actualizar} disabled={cargando}>
            Actualizar tareas
          </button>
        </div>
      </section>

      <section className="panel listado" aria-labelledby="titulo-mis-tareas" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-mis-tareas">Tareas asignadas</h2>
            <p>Primero las más urgentes y, a igual prioridad, las más antiguas.</p>
          </div>
          {!cargando && !error && cuadrillaActual && (
            <span className="contador" role="status" aria-atomic="true">
              {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}
            </span>
          )}
        </div>

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={actualizar}>
              Volver a cargar
            </button>
          </div>
        )}

        {faltaDatoDeCuadrilla && !error && (
          <p className="mensaje mensaje-informacion" role="status">
            El servidor todavía no informa a qué cuadrilla está asignada cada orden, por eso no se pueden mostrar las tareas de una cuadrilla.
          </p>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando tareas…</p>
          </div>
        ) : !error && !faltaDatoDeCuadrilla && (
          !cuadrillaActual ? (
            <div className="estado-listado estado-vacio">
              <span className="icono-vacio"><Icono nombre="cuadrilla" /></span>
              <h3>Elegí tu cuadrilla</h3>
              <p>Cuando elijas una cuadrilla, vas a ver acá los trabajos que tiene asignados.</p>
            </div>
          ) : tareas.length === 0 ? (
            <div className="estado-listado estado-vacio">
              <span className="icono-vacio"><Icono nombre="tareas" /></span>
              <h3>No hay tareas asignadas a {cuadrillaActual.nombre}</h3>
              <p>Cuando se le asigne un trabajo, va a aparecer acá. Podés tocar “Actualizar tareas” para revisar.</p>
            </div>
          ) : (
            <ul className="lista-tareas" aria-labelledby="titulo-mis-tareas">
              {tareas.map((orden) => (
                <TarjetaTarea key={orden.id} orden={orden} estados={estados}
                  ocupada={orden.id === idGuardando}
                  bloqueada={idGuardando != null && orden.id !== idGuardando}
                  onAccion={accion}
                  onVerFicha={(lugarId) => onNavegar('ficha', { lugarId })} />
              ))}
            </ul>
          )
        )}
      </section>
    </>
  )
}

export default PaginaMisTareas
