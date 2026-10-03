import { useEffect, useState } from 'react'
import { listarOrdenes } from '../api/ordenesTrabajo'
import { listarEstados } from '../api/estadosOrden'
import { listarPuntos } from '../api/infraestructura'
import { asignarCuadrilla, listarCuadrillas } from '../api/cuadrillas'
import FiltrosOrdenes from '../components/FiltrosOrdenes'
import TablaAsignacion from '../components/TablaAsignacion'
import TablaCuadrillas from '../components/TablaCuadrillas'
import Icono from '../components/Icono'
import { ordenesPendientes } from '../utils/asignacion'
import { FILTROS_ORDENES_VACIOS, filtrarOrdenes, rangoFechasValido } from '../utils/filtrosOrdenes'

function PaginaAsignacion() {
  const [ordenes, setOrdenes] = useState([])
  const [estados, setEstados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cuadrillas, setCuadrillas] = useState([])
  const [cargandoCuadrillas, setCargandoCuadrillas] = useState(true)
  const [errorCuadrillas, setErrorCuadrillas] = useState(null)
  const [lugares, setLugares] = useState([])
  const [filtros, setFiltros] = useState(FILTROS_ORDENES_VACIOS)
  // Id de la OT que se está asignando (para bloquear la tabla mientras tanto)
  const [idAsignando, setIdAsignando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  const pendientes = ordenesPendientes(ordenes, estados)
  const pendientesFiltradas = filtrarOrdenes(pendientes, filtros)
  const rangoValido = rangoFechasValido(filtros)

  function cargarOrdenes() {
    // Sin los estados no se sabe cuáles son las pendientes: si falla uno de los dos pedidos, es un error de carga.
    return Promise.all([listarOrdenes(), listarEstados()])
      .then(([datosOrdenes, datosEstados]) => {
        setOrdenes(datosOrdenes)
        setEstados(datosEstados)
        setError(null)
      })
      .catch((e) => {
        console.error(e)
        setError('No pudimos cargar las órdenes de trabajo. Revisá la conexión e intentá nuevamente.')
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

  function recargarOrdenes() {
    setCargando(true)
    cargarOrdenes()
  }

  function recargarCuadrillas() {
    setCargandoCuadrillas(true)
    cargarCuadrillas()
  }

  useEffect(() => {
    cargarOrdenes()
    cargarCuadrillas()
    listarPuntos()
      .then((datos) => setLugares([...datos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))))
      .catch((e) => console.error(e)) // sin lugares, el filtro por lugar queda vacío pero el resto funciona
  }, [])

  function asignar(orden, cuadrilla) {
    setIdAsignando(orden.id)
    setMensaje('')
    setErrorAccion('')
    asignarCuadrilla(orden.id, cuadrilla.id)
      .then((actualizada) => {
        // La OT cambió de estado: reemplazamos solo esa OT y deja de figurar como pendiente.
        setOrdenes((anteriores) => anteriores.map((o) => (o.id === actualizada.id ? actualizada : o)))
        const estadoNuevo = actualizada.estadoNombre ? ` y pasó a "${actualizada.estadoNombre}"` : ''
        setMensaje(`La OT #${actualizada.id} se asignó a ${cuadrilla.nombre}${estadoNuevo}.`)
      })
      .catch((e) => {
        console.error(e)
        // e.message trae el motivo que explica el backend (ej: la cuadrilla ya está ocupada)
        setErrorAccion(e.message || 'No se pudo asignar la orden. Intentá nuevamente.')
      })
      .finally(() => {
        setIdAsignando(null)
        cargarCuadrillas() // la disponibilidad pudo cambiar, haya salido bien o no
      })
  }

  const limpiarFiltros = () => setFiltros(FILTROS_ORDENES_VACIOS)

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">TRABAJOS DEL CORRALÓN</p>
        <h1>Asignación a cuadrillas</h1>
        <p>Elegí qué cuadrilla se encarga de cada trabajo pendiente. Solo se ofrecen las cuadrillas que realizan ese tipo de tarea y no están ocupadas. Al asignar, la orden cambia de estado.</p>
      </div>

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
        {errorAccion && <p className="mensaje mensaje-error" role="alert">{errorAccion}</p>}
      </div>

      <section className="panel listado panel-cuadrillas" aria-labelledby="titulo-cuadrillas" aria-busy={cargandoCuadrillas}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-cuadrillas">Cuadrillas</h2>
            <p>Si una cuadrilla está ocupada, no se le pueden asignar más trabajos.</p>
          </div>
        </div>

        {errorCuadrillas && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{errorCuadrillas}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargarCuadrillas}>
              Volver a cargar
            </button>
          </div>
        )}

        {cargandoCuadrillas && cuadrillas.length === 0 ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando cuadrillas…</p>
          </div>
        ) : (
          <TablaCuadrillas cuadrillas={cuadrillas} errorCarga={Boolean(errorCuadrillas)} />
        )}
      </section>

      <section className="panel listado" aria-labelledby="titulo-pendientes" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-pendientes">Órdenes pendientes de asignar</h2>
            <p>Primero las más urgentes y, a igual prioridad, las más antiguas.</p>
          </div>
          {!cargando && !error && (
            <span className="contador" role="status" aria-atomic="true">
              Mostrando {pendientesFiltradas.length} de {pendientes.length} {pendientes.length === 1 ? 'orden pendiente' : 'órdenes pendientes'}
            </span>
          )}
        </div>

        <FiltrosOrdenes filtros={filtros} lugares={lugares} onCambiar={setFiltros} onLimpiar={limpiarFiltros} />

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
        ) : !error && rangoValido && (
          <TablaAsignacion
            ordenes={pendientesFiltradas}
            cuadrillas={cuadrillas}
            errorCuadrillas={Boolean(errorCuadrillas)}
            cargandoCuadrillas={cargandoCuadrillas && cuadrillas.length === 0}
            onAsignar={asignar}
            idAsignando={idAsignando}
            sinCoincidencias={pendientes.length > 0}
            onLimpiarFiltros={limpiarFiltros}
          />
        )}
      </section>
    </>
  )
}

export default PaginaAsignacion
