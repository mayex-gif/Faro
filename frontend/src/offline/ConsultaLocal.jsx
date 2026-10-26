import { useEffect, useRef, useState } from 'react'
import TarjetaTarea from '../components/TarjetaTarea'
import AvisoCambiosPendientes from '../components/AvisoCambiosPendientes'
import Icono from '../components/Icono'
import { useColaCambios, useCuandoSeEnvian } from '../hooks/useColaCambios'
import { leerSesion, leerToken, limpiarSesion, tokenVigente } from '../utils/sesion'
import { cerradasSinEnviar, tareasDeCuadrilla } from '../utils/tareas'
import { borrarCopia, guardarCopia, leerCopia } from './almacen'
import { actualizarCopia, esCapatazConCuadrilla, fechaDeCopia } from './datosLocal'
import { guardarOperacion } from './cola'
import { aplicarPendientes, crearCambioEstado } from './datosCola'
import { EVENTO_RESPUESTA, iniciarSincronizacion } from './sincronizar'

// La copia local del capataz, para cuando se abre FARO sin señal. No abre la aplicación ni verifica el perfil
// con el servidor: lo que se inicia o finaliza acá va al cuaderno del celular y el servidor lo revisa al llegar
// (permisos, si la OT sigue siendo de la cuadrilla, si alguien la cambió antes). Ver PWA_SINCRONIZACION.md.
function ConsultaLocal() {
  const [copia, setCopia] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sesion, setSesion] = useState(leerSesion)
  const [mensaje, setMensaje] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  const habilitada = tokenVigente(sesion.token) && esCapatazConCuadrilla(sesion.usuario)
  const usuario = habilitada ? sesion.usuario : null
  // El cuaderno de esta persona y el cartero que lo manda cuando hay señal (también desde esta pantalla)
  const { cola, pendientes, conflictos } = useColaCambios(usuario)
  useEffect(() => iniciarSincronizacion(usuario), [usuario])
  useCuandoSeEnvian({ pendientes, conflictos }, (enviados) => {
    setMensaje(enviados === 0 ? '' : `Volvió la señal: ${enviados === 1 ? 'se envió 1 cambio' : `se enviaron ${enviados} cambios`} que habías hecho sin señal.`)
  })

  useEffect(() => {
    const { token, usuario: cuenta } = sesion
    let vigente = true
    async function cargar() {
      try {
        if (!tokenVigente(token) || !esCapatazConCuadrilla(cuenta)) return
        const guardada = await leerCopia(cuenta)
        if (vigente && token === leerSesion().token) setCopia(guardada)
      } catch {
        if (vigente) setError('No pudimos leer la copia local. Volvé a FARO con conexión e intentá guardarla nuevamente.')
      } finally {
        if (vigente) setCargando(false)
      }
    }
    cargar()
    return () => { vigente = false }
  }, [sesion])

  useEffect(() => {
    function revisar() { setSesion(leerSesion()) }
    const reloj = window.setInterval(revisar, 30000)
    window.addEventListener('storage', revisar)
    window.addEventListener('focus', revisar)
    return () => {
      window.clearInterval(reloj)
      window.removeEventListener('storage', revisar)
      window.removeEventListener('focus', revisar)
    }
  }, [])

  // Cuando el servidor responde un cambio, la copia se pone al día (si no, al salir del cuaderno la tarjeta
  // "volvería" a su estado viejo). Se guarda también en el celular, para la próxima vez que se abra sin señal.
  const copiaActual = useRef(copia)
  useEffect(() => { copiaActual.current = copia }, [copia])
  useEffect(() => {
    function alResponder(evento) {
      if (!copiaActual.current) return
      const nueva = actualizarCopia(copiaActual.current, evento.detail.operacion, evento.detail)
      copiaActual.current = nueva
      setCopia(nueva)
      guardarCopia(nueva, leerToken()).catch(() => {}) // si no se puede guardar, se ve bien igual mientras esté abierta
    }
    window.addEventListener(EVENTO_RESPUESTA, alResponder)
    return () => window.removeEventListener(EVENTO_RESPUESTA, alResponder)
  }, [])

  async function salir() {
    limpiarSesion()
    setCopia(null)
    await borrarCopia().catch(() => {})
    window.location.assign('/')
  }

  // Iniciar o finalizar desde la copia: siempre se anota en el cuaderno (el cartero lo manda en cuanto haya señal)
  async function accion(orden, estadoNuevo) {
    if (estadoNuevo.cierre) {
      const confirmado = window.confirm(
        `¿Pasar la OT #${orden.id} a "${estadoNuevo.nombre}"? Después ya no se va a poder modificar.`)
      if (!confirmado) return
    }
    setMensaje('')
    setErrorAccion('')
    try {
      await guardarOperacion(crearCambioEstado(sesion.usuario, orden, estadoNuevo))
      setMensaje(`La OT #${orden.id} quedó en "${estadoNuevo.nombre}" en este celular. Se envía sola cuando haya señal.`)
    } catch {
      setErrorAccion('Este navegador no permite guardar el cambio. Intentá de nuevo desde FARO cuando tengas conexión.')
    }
  }

  // También se comprueba al dibujar: un cambio de usuario no debe dejar visible una copia anterior.
  const visible = habilitada && copia && String(copia.usuarioId) === String(sesion.usuario.id)
    && String(copia.cuadrillaId) === String(sesion.usuario.cuadrillaId)
  // Las tareas de la copia con los cambios del cuaderno ya aplicados ("Sin enviar")
  const vistas = visible ? aplicarPendientes(copia.ordenes, cola, copia.estados) : []
  const tareas = visible ? tareasDeCuadrilla(vistas, copia.estados, copia.cuadrillaId) : []
  const cerradas = visible ? cerradasSinEnviar(vistas, copia.estados, copia.cuadrillaId) : []

  return (
    <>
      <header className="barra-superior">
        <div className="marca">
          <img src="/logo-faro.png" alt="" className="marca-logo" width="40" height="40" />
          <div><span className="marca-nombre">FARO</span><span className="marca-lugar">Estación General Paz</span></div>
        </div>
        <nav className="consulta-acciones" aria-label="Consulta local">
          <a className="nav-enlace" href="/">Volver a FARO</a>
          <button type="button" className="nav-enlace" onClick={salir}>Cerrar sesión</button>
        </nav>
      </header>
      <main className="pagina consulta-local">
        <div className="encabezado-pagina">
          <p className="sobre-titulo">TRABAJO EN TERRITORIO</p>
          <h1>Mis tareas sin conexión</h1>
          <p>La copia de tus trabajos guardada en este celular.</p>
        </div>
        <div className="mensaje mensaje-informacion" role="status">
          <p>Lo que inicies o finalices queda guardado en este celular y se envía solo cuando haya señal.
            Los datos pueden haber cambiado: si alguien modificó una tarea mientras tanto, te vamos a avisar.</p>
        </div>

        <div className="notificaciones" aria-live="polite" aria-atomic="true">
          {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
          {errorAccion && <p className="mensaje mensaje-error" role="alert">{errorAccion}</p>}
        </div>

        {habilitada && <AvisoCambiosPendientes cola={cola} />}

        {!habilitada ? <section className="panel estado-listado">
          <h2>No hay una sesión vigente de capataz</h2>
          <p>Ingresá con conexión y guardá tus tareas desde Mis tareas. Al cerrar sesión se elimina la copia local.</p>
        </section> : cargando ? <p role="status">Buscando la copia guardada…</p>
          : error ? <p className="mensaje mensaje-error" role="alert">{error}</p>
            : !visible ? <section className="panel estado-listado">
              <h2>No hay una copia para tu cuenta y cuadrilla</h2>
              <p>Con conexión, abrí Mis tareas y elegí “Guardar copia local” antes de salir a trabajar.
                Si la guardaste con una versión anterior de FARO, volvé a guardarla.</p>
            </section> : <section className="panel listado" aria-labelledby="titulo-copia">
              <div className="panel-encabezado">
                <div>
                  <h2 id="titulo-copia">{copia.cuadrillaNombre}</h2>
                  <p>Guardada el <time dateTime={copia.fechaGuardado}>{fechaDeCopia(copia.fechaGuardado)}</time></p>
                </div>
                <span className="contador">{tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}</span>
              </div>
              {tareas.length === 0 && cerradas.length === 0 ? <div className="estado-listado estado-vacio">
                <h3>No hay tareas abiertas en esta copia</h3>
                <p>Volvé a FARO con conexión para consultar si hay trabajos nuevos.</p>
              </div> : <ul className="lista-tareas">
                {tareas.map((orden) => <TarjetaTarea key={orden.id} orden={orden} estados={copia.estados} onAccion={accion} />)}
                {cerradas.map((orden) => <TarjetaTarea key={orden.id} orden={orden} soloLectura />)}
              </ul>}
            </section>}
      </main>
    </>
  )
}

export default ConsultaLocal
