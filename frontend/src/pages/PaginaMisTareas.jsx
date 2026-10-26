import { useEffect, useRef, useState } from 'react'
import { cambiarEstadoOrden, listarOrdenes } from '../api/ordenesTrabajo'
import { listarEstados } from '../api/estadosOrden'
import { listarCuadrillas } from '../api/cuadrillas'
import TarjetaTarea from '../components/TarjetaTarea'
import AvisoCambiosPendientes from '../components/AvisoCambiosPendientes'
import Icono from '../components/Icono'
import { cerradasSinEnviar, tareasDeCuadrilla } from '../utils/tareas'
import { useSesion } from '../context/useSesion'
import { tieneRol } from '../utils/permisos'
import { leerToken } from '../utils/sesion'
import { borrarCopia, guardarCopia, leerCopia } from '../offline/almacen'
import { crearCopia, fechaDeCopia } from '../offline/datosLocal'
import { guardarOperacion } from '../offline/cola'
import { REINTENTAR, aplicarPendientes, clasificarError, crearCambioEstado } from '../offline/datosCola'
import { useColaCambios, useCuandoSeEnvian } from '../hooks/useColaCambios'
import '../estilos-mis-tareas.css'
import '../offline/estilos-local.css'

// El encargado puede elegir una cuadrilla para supervisar. El capataz usa la de su perfil.
const CLAVE_CUADRILLA = 'faro.cuadrillaElegida'

function leerCuadrillaGuardada() {
  try {
    return localStorage.getItem(CLAVE_CUADRILLA) ?? ''
  } catch {
    return '' // el navegador no deja guardar datos: simplemente no se recuerda
  }
}

// Lo último que se cargó con señal, por persona. Vive mientras FARO esté abierto (no se guarda en el celular):
// si se corta la señal y se toca "Actualizar", o se va al mapa y se vuelve, se siguen viendo las tareas en vez de un error.
const ultimaCarga = new Map()

function horaDe(fecha) {
  return fecha ? new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
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
  const { usuario } = useSesion()
  const esCapataz = tieneRol(usuario, 'CAPATAZ_CUADRILLA')
  // Fijo mientras la pantalla está abierta (App la vuelve a armar si entra otra persona)
  const idUsuario = useRef(usuario.id)
  const recordada = ultimaCarga.get(usuario.id)
  const [ordenes, setOrdenes] = useState(() => recordada?.ordenes ?? [])
  const [estados, setEstados] = useState(() => recordada?.estados ?? [])
  const [cargadasA, setCargadasA] = useState(() => recordada?.hora ?? null)
  const [cargando, setCargando] = useState(() => !recordada?.ordenes)
  const [error, setError] = useState(null)
  // true si el último intento de traer las tareas falló por falta de señal (se muestran las que ya estaban)
  const [sinSenal, setSinSenal] = useState(false)
  const [cuadrillas, setCuadrillas] = useState(() => recordada?.cuadrillas ?? [])
  const [cargandoCuadrillas, setCargandoCuadrillas] = useState(() => !recordada?.cuadrillas)
  const [errorCuadrillas, setErrorCuadrillas] = useState(null)
  const [cuadrillaElegida, setCuadrillaId] = useState(leerCuadrillaGuardada)
  const cuadrillaId = esCapataz ? usuario.cuadrillaId : cuadrillaElegida
  // Id de la tarea que se está guardando (bloquea los botones de las demás mientras tanto)
  const [idGuardando, setIdGuardando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [copiaLocal, setCopiaLocal] = useState(null)
  const [guardandoCopia, setGuardandoCopia] = useState(false)
  const [avisoCopia, setAvisoCopia] = useState('')
  // El cuaderno: los cambios hechos sin señal que todavía no llegaron (o que hay que revisar)
  const { cola, pendientes, conflictos } = useColaCambios(usuario)

  function cargarOrdenes() {
    // Sin los estados no se sabe qué se puede hacer con cada tarea: si falla uno de los dos pedidos, es un error de carga.
    return Promise.all([listarOrdenes(), listarEstados()])
      .then(([datosOrdenes, datosEstados]) => {
        setOrdenes(datosOrdenes)
        setEstados(datosEstados)
        setCargadasA(new Date().toISOString())
        setError(null)
        setSinSenal(false)
      })
      .catch((e) => {
        // Sin señal, pero con tareas ya cargadas: se siguen mostrando (con un aviso) en vez de borrar la lista
        if (clasificarError(e) === REINTENTAR && ultimaCarga.get(idUsuario.current)?.ordenes) {
          setSinSenal(true)
          return
        }
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
        if (clasificarError(e) === REINTENTAR && ultimaCarga.get(idUsuario.current)?.cuadrillas) return // se usan las que ya estaban
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
    // Cuando vuelve la señal se trae cómo están las tareas ahora
    window.addEventListener('online', cargarOrdenes)
    return () => window.removeEventListener('online', cargarOrdenes)
  }, [])

  // Se recuerda lo cargado (también después de iniciar o finalizar con señal) para usarlo si se corta la señal
  useEffect(() => {
    if (cargando || cargandoCuadrillas || error || errorCuadrillas) return
    ultimaCarga.set(usuario.id, { ordenes, estados, cuadrillas, hora: cargadasA })
  }, [usuario.id, ordenes, estados, cuadrillas, cargadasA, cargando, cargandoCuadrillas, error, errorCuadrillas])

  // Cuando un cambio del cuaderno llega al servidor (o queda para revisar), se trae cómo quedaron las tareas
  // y se avisa cuántos llegaron bien (los que quedaron para revisar los muestra el cartel).
  useCuandoSeEnvian({ pendientes, conflictos }, (enviados) => {
    setMensaje(enviados === 0 ? '' : `Volvió la señal: ${enviados === 1 ? 'se envió 1 cambio' : `se enviaron ${enviados} cambios`} que habías hecho sin señal.`)
    cargarOrdenes()
  })

  useEffect(() => {
    let vigente = true
    if (esCapataz) leerCopia(usuario).then((copia) => {
      if (vigente) setCopiaLocal(copia)
    }).catch(() => {}) // La falta de almacenamiento no impide trabajar conectado.
    return () => { vigente = false }
  }, [usuario, esCapataz])

  function elegirCuadrilla(evento) {
    setCuadrillaId(evento.target.value)
    guardarCuadrilla(evento.target.value)
    setMensaje('')
    setErrorAccion('')
  }

  // Solo vale la cuadrilla recordada si todavía existe.
  const cuadrillaActual = cuadrillas.find((cuadrilla) => String(cuadrilla.id) === String(cuadrillaId))
  // El capataz ve sus tareas con los cambios hechos sin señal ya aplicados (marcados "Sin enviar")
  const ordenesVistas = esCapataz ? aplicarPendientes(ordenes, cola, estados) : ordenes
  const tareas = cuadrillaActual ? tareasDeCuadrilla(ordenesVistas, estados, cuadrillaActual.id) : []
  // Lo finalizado o cancelado sin señal sigue a la vista (sin botones, con "Sin enviar") hasta que llega
  const cerradas = cuadrillaActual ? cerradasSinEnviar(ordenesVistas, estados, cuadrillaActual.id) : []
  // Mientras el backend no informe a qué cuadrilla pertenece cada OT (CONTRATO_CUADRILLAS.md), no se puede saber cuáles son "mis" tareas.
  const faltaDatoDeCuadrilla = ordenes.length > 0 && !ordenes.some((orden) => 'cuadrillaId' in orden)

  async function guardarConsulta() {
    const token = leerToken()
    setGuardandoCopia(true)
    setAvisoCopia('')
    try {
      const copia = crearCopia(usuario, cuadrillaActual, ordenes, estados)
      await guardarCopia(copia, token)
      setCopiaLocal(copia)
      setAvisoCopia('Copia guardada. Podés consultarla en este dispositivo mientras tu sesión esté vigente.')
    } catch (e) {
      setAvisoCopia(e.message || 'No pudimos guardar la copia. Revisá el espacio y los permisos del navegador.')
    } finally { setGuardandoCopia(false) }
  }

  async function eliminarConsulta() {
    setGuardandoCopia(true)
    try {
      await borrarCopia()
      setCopiaLocal(null)
      setAvisoCopia('Se eliminó la copia de este dispositivo.')
    } catch { setAvisoCopia('No pudimos eliminar la copia. Intentá nuevamente.') }
    finally { setGuardandoCopia(false) }
  }

  // Sin señal (solo el capataz): el cambio se anota en el cuaderno del celular y se manda solo cuando vuelva la red
  async function guardarSinSenal(orden, estadoNuevo) {
    try {
      await guardarOperacion(crearCambioEstado(usuario, orden, estadoNuevo))
      setMensaje(`No hay señal: la OT #${orden.id} quedó en "${estadoNuevo.nombre}" en este celular. Se envía sola cuando vuelva la señal.`)
    } catch {
      setErrorAccion('No hay señal y este navegador no permite guardar el cambio. Intentá de nuevo cuando tengas conexión.')
    }
  }

  function accion(orden, estadoNuevo) {
    if (esCapataz && (usuario.cuadrillaId == null || String(orden.cuadrillaId) !== String(usuario.cuadrillaId))) {
      setErrorAccion('Esta tarea no pertenece a tu cuadrilla.')
      return
    }
    // Finalizada y Cancelada no tienen vuelta atrás: pedimos confirmación
    if (estadoNuevo.cierre) {
      const confirmado = window.confirm(
        `¿Pasar la OT #${orden.id} a "${estadoNuevo.nombre}"? Después ya no se va a poder modificar.`)
      if (!confirmado) return
    }
    setMensaje('')
    setErrorAccion('')
    if (esCapataz && navigator.onLine === false) {
      guardarSinSenal(orden, estadoNuevo)
      return
    }
    setIdGuardando(orden.id)
    cambiarEstadoOrden(orden.id, estadoNuevo.id)
      .then((actualizada) => {
        // reemplazamos solo esa OT: si quedó cerrada, deja de figurar entre las tareas
        setOrdenes((anteriores) => anteriores.map((o) => (o.id === actualizada.id ? actualizada : o)))
        setMensaje(`La OT #${actualizada.id} pasó a "${actualizada.estadoNombre}".`)
      })
      .catch((e) => {
        // Se cortó la señal en el camino (o el servidor falló): no se pierde, va al cuaderno.
        // Si en realidad había llegado, el servidor lo reconoce al recibirlo de nuevo ("ya estaba así").
        if (esCapataz && clasificarError(e) === REINTENTAR) return guardarSinSenal(orden, estadoNuevo)
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
        <p>{esCapataz ? 'Consultá los trabajos de tu cuadrilla y registrá su inicio y finalización.'
          : 'Elegí una cuadrilla para supervisar sus trabajos asignados.'}</p>
      </div>

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
        {errorAccion && <p className="mensaje mensaje-error" role="alert">{errorAccion}</p>}
      </div>

      {esCapataz && <AvisoCambiosPendientes cola={cola} />}

      {esCapataz && <section className="panel copia-local" aria-labelledby="titulo-consulta-local" aria-busy={guardandoCopia}>
        <h2 id="titulo-consulta-local">Consulta sin conexión</h2>
        <p>Guardá una copia de tus tareas antes de salir, para poder consultarlas aunque abras FARO sin señal. Si la señal se corta mientras trabajás, lo que inicies o finalices queda guardado en este celular y se envía solo.</p>
        {copiaLocal && <p>Última copia: <time dateTime={copiaLocal.fechaGuardado}>{fechaDeCopia(copiaLocal.fechaGuardado)}</time>.</p>}
        <div className="acciones">
          <button type="button" className="boton boton-secundario" onClick={guardarConsulta}
            disabled={guardandoCopia || cargando || cargandoCuadrillas || Boolean(error) || Boolean(errorCuadrillas) || !cuadrillaActual || faltaDatoDeCuadrilla}>
            {guardandoCopia ? 'Procesando copia…' : copiaLocal ? 'Actualizar copia local' : 'Guardar copia local'}
          </button>
          {copiaLocal && <>
            <a className="boton boton-secundario" href="/sin-conexion.html">Ver copia local</a>
            <button type="button" className="boton boton-secundario" onClick={eliminarConsulta} disabled={guardandoCopia}>Eliminar copia local</button>
          </>}
        </div>
        {avisoCopia && <p className="mensaje mensaje-informacion" role="status">{avisoCopia}</p>}
      </section>}

      <section className="panel listado panel-cuadrillas" aria-labelledby="titulo-mi-cuadrilla" aria-busy={cargandoCuadrillas}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-mi-cuadrilla">Tu cuadrilla</h2>
            <p>{esCapataz ? 'La cuadrilla se obtiene de tu cuenta municipal.' : 'Seleccioná la cuadrilla que querés consultar.'}</p>
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
          {esCapataz ? <div className="campo">
            <strong>{cargandoCuadrillas ? 'Cargando cuadrilla…' : cuadrillaActual?.nombre ?? 'Sin cuadrilla asignada'}</strong>
            {!cargandoCuadrillas && !errorCuadrillas && !cuadrillaActual && (
              <p className="mensaje mensaje-informacion">Consultá al encargado para que revise la cuadrilla de tu cuenta.</p>
            )}
          </div> : <div className="campo">
            <label htmlFor="mi-cuadrilla">Cuadrilla</label>
            <select id="mi-cuadrilla" value={cuadrillaActual ? String(cuadrillaActual.id) : ''}
              onChange={elegirCuadrilla} disabled={cargandoCuadrillas || cuadrillas.length === 0}>
              <option value="">{cargandoCuadrillas ? 'Cargando cuadrillas…' : 'Elegir cuadrilla'}</option>
              {cuadrillas.map((cuadrilla) => (
                <option key={cuadrilla.id} value={cuadrilla.id}>{cuadrilla.nombre}</option>
              ))}
            </select>
          </div>}
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

        {sinSenal && !error && !cargando && (
          <p className="mensaje mensaje-informacion" role="status">
            Sin señal: estás viendo las tareas cargadas a las {horaDe(cargadasA)}.
            {esCapataz && ' Lo que inicies o finalices queda guardado en este celular y se envía solo.'}
          </p>
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
              <h3>{esCapataz ? 'No hay una cuadrilla vinculada a tu cuenta' : 'Elegí una cuadrilla'}</h3>
              <p>{esCapataz ? 'Consultá al encargado del corralón para poder ver tus tareas.'
                : 'Cuando elijas una cuadrilla, vas a ver acá los trabajos que tiene asignados.'}</p>
            </div>
          ) : tareas.length === 0 && cerradas.length === 0 ? (
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
              {cerradas.map((orden) => (
                <TarjetaTarea key={orden.id} orden={orden} soloLectura
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
