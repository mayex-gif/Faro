import { useEffect, useState } from 'react'
import TarjetaTarea from '../components/TarjetaTarea'
import { leerSesion, limpiarSesion, tokenVigente } from '../utils/sesion'
import { borrarCopia, leerCopia } from './almacen'
import { esCapatazConCuadrilla, fechaDeCopia } from './datosLocal'

// Esta pantalla solo consulta una copia. No abre la aplicación ni concede permisos sin verificar el perfil.
function ConsultaLocal() {
  const [copia, setCopia] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sesion, setSesion] = useState(leerSesion)

  useEffect(() => {
    const { token, usuario } = sesion
    let vigente = true
    async function cargar() {
      try {
        if (!tokenVigente(token) || !esCapatazConCuadrilla(usuario)) return
        const guardada = await leerCopia(usuario)
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

  async function salir() {
    limpiarSesion()
    setCopia(null)
    await borrarCopia().catch(() => {})
    window.location.assign('/')
  }

  const habilitada = tokenVigente(sesion.token) && esCapatazConCuadrilla(sesion.usuario)
  // También se comprueba al dibujar: un cambio de usuario no debe dejar visible una copia anterior.
  const visible = habilitada && copia && String(copia.usuarioId) === String(sesion.usuario.id)
    && String(copia.cuadrillaId) === String(sesion.usuario.cuadrillaId)

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
          <h1>Consulta local de mis tareas</h1>
          <p>Una copia de los trabajos guardados en este dispositivo.</p>
        </div>
        <div className="mensaje mensaje-informacion" role="status">
          <p>Solo consulta. Estos datos pueden haber cambiado. Para iniciar, finalizar o actualizar un trabajo, volvé a FARO con conexión.</p>
        </div>
        {!habilitada ? <section className="panel estado-listado">
          <h2>No hay una sesión vigente de capataz</h2>
          <p>Ingresá con conexión y guardá tus tareas desde Mis tareas. Al cerrar sesión se elimina la copia local.</p>
        </section> : cargando ? <p role="status">Buscando la copia guardada…</p>
          : error ? <p className="mensaje mensaje-error" role="alert">{error}</p>
            : !visible ? <section className="panel estado-listado">
              <h2>No hay una copia para tu cuenta y cuadrilla</h2>
              <p>Con conexión, abrí Mis tareas y elegí “Guardar copia local” antes de salir a trabajar.</p>
            </section> : <section className="panel listado" aria-labelledby="titulo-copia">
              <div className="panel-encabezado">
                <div>
                  <h2 id="titulo-copia">{copia.cuadrillaNombre}</h2>
                  <p>Guardada el <time dateTime={copia.fechaGuardado}>{fechaDeCopia(copia.fechaGuardado)}</time>.</p>
                </div>
                <span className="contador">{copia.ordenes.length} {copia.ordenes.length === 1 ? 'tarea' : 'tareas'}</span>
              </div>
              {copia.ordenes.length === 0 ? <div className="estado-listado estado-vacio">
                <h3>No había tareas asignadas al guardar esta copia</h3>
                <p>Volvé a FARO con conexión para consultar si hay trabajos nuevos.</p>
              </div> : <ul className="lista-tareas">
                {copia.ordenes.map((orden) => <TarjetaTarea key={orden.id} orden={orden} soloLectura />)}
              </ul>}
            </section>}
      </main>
    </>
  )
}

export default ConsultaLocal
