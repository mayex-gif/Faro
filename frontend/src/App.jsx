import { useEffect, useState } from 'react'
import Icono from './components/Icono'
import Buscador from './components/Buscador'
import MenuDesplegable from './components/MenuDesplegable'
import BarraUsuario from './components/BarraUsuario'
import PaginaLogin from './pages/PaginaLogin'
import PaginaInfraestructura from './pages/PaginaInfraestructura'
import PaginaOrdenes from './pages/PaginaOrdenes'
import PaginaAsignacion from './pages/PaginaAsignacion'
import PaginaMapa from './pages/PaginaMapa'
import PaginaFichaLugar from './pages/PaginaFichaLugar'
import PaginaMisTareas from './pages/PaginaMisTareas'
import { useAuth } from './context/AuthContext'
import {
  INICIO, NUEVO, esPantallaCompleta, estaEnMas, inicioPara, masPara, puedeVer, seccionesPara, tituloDe,
} from './utils/navegacion'
import './App.css'
import './estilos-navegacion.css'

// Qué pantalla se dibuja para cada clave. El orden del menú y los nombres están en utils/navegacion.js.
// Para agregar una pantalla nueva: sumarla acá y en utils/navegacion.js.
const PAGINAS = {
  infraestructura: PaginaInfraestructura,
  ordenes: PaginaOrdenes,
  asignacion: PaginaAsignacion,
  mapa: PaginaMapa,
  ficha: PaginaFichaLugar,
  tareas: PaginaMisTareas,
}

function App() {
  const { usuario, estaAutenticado } = useAuth()

  // Qué pantalla se pidió ver y con qué datos (params: ej. { lugarId: 3 } para abrir la ficha de un lugar)
  const [vista, setVista] = useState({ clave: INICIO, params: {} })

  // La pantalla que realmente se dibuja: si la pedida no es para el rol logueado (por ejemplo, un
  // capataz pidiendo Infraestructura, o recién inició sesión), se muestra la inicial de su rol en su
  // lugar. El capataz arranca directo en "Mis tareas" (FRONTEND_AUTENTICACION_Y_ROLES.md, 3.6); el
  // resto, en el mapa. Se calcula al dibujar (no en un efecto) para no duplicar el estado de la vista.
  const paginaActual = usuario && !puedeVer(usuario.rol, vista.clave) ? inicioPara(usuario.rol) : vista.clave
  const params = paginaActual === vista.clave ? vista.params : {}
  const Componente = PAGINAS[paginaActual]
  const completa = esPantallaCompleta(paginaActual) // el mapa ocupa todo, sin márgenes ni pie de página
  const secciones = seccionesPara(usuario?.rol)
  const mas = masPara(usuario?.rol)
  const nuevo = usuario ? NUEVO.filter((opcion) => puedeVer(usuario.rol, opcion.clave)) : []

  // El nombre de la pestaña del navegador acompaña a la pantalla: "Trabajos | FARO"
  useEffect(() => {
    document.title = `${tituloDe(paginaActual)} | FARO`
  }, [paginaActual])

  // Las pantallas reciben "onNavegar" para llevar al usuario a otra pantalla: onNavegar('ficha', { lugarId: 3 })
  function navegar(clave, params = {}) {
    setVista({ clave, params })
    document.getElementById('contenido')?.focus() // el foco va al contenido nuevo (accesibilidad)
    window.scrollTo(0, 0) // la pantalla nueva empieza desde arriba
  }

  function irA(evento, clave) {
    evento.preventDefault() // evita el salto del enlace: cambiamos de pantalla nosotros
    navegar(clave)
  }

  if (!estaAutenticado) {
    return <PaginaLogin />
  }

  return (
    <div className={completa ? 'aplicacion aplicacion-completa' : 'aplicacion'}>
      <a className="saltar-contenido" href="#contenido">Saltar al contenido</a>

      <header className="barra-superior">
        <div className="marca">
          <img src="/logo-faro.png" alt="" className="marca-logo" width="40" height="40" />
          <div>
            <span className="marca-nombre">FARO</span>
            <span className="marca-lugar">Estación General Paz</span>
          </div>
        </div>

        {/* Elegir un lugar o un trabajo lleva al mapa con ese lugar elegido.
            "vez" cambia en cada búsqueda: así el mapa se vuelve a armar aunque ya se esté viendo. */}
        <Buscador onElegirLugar={(lugarId) => navegar('mapa', { lugarId, vez: Date.now() })} />

        <nav className="nav-secciones" aria-label="Secciones">
          {secciones.map((seccion) => (
            <a key={seccion.clave} href="#contenido"
              className={seccion.clave === paginaActual ? 'nav-enlace nav-enlace-activo' : 'nav-enlace'}
              aria-current={seccion.clave === paginaActual ? 'page' : undefined}
              onClick={(evento) => irA(evento, seccion.clave)}>
              {seccion.titulo}
            </a>
          ))}
          {mas.length > 0 && (
            <MenuDesplegable opciones={mas} claveActual={paginaActual} onElegir={(clave) => navegar(clave)}
              claseBoton={estaEnMas(paginaActual) ? 'nav-enlace nav-enlace-activo' : 'nav-enlace'}
              contenidoBoton={<>Más<Icono nombre="abajo" /></>} />
          )}
        </nav>

        {/* Siempre en el mismo lugar: crear algo nuevo no depende de en qué pantalla estés.
            Si el rol no puede crear nada (ej. capataz), el botón no se muestra. */}
        {nuevo.length > 0 && (
          <MenuDesplegable opciones={nuevo} onElegir={(clave) => navegar(clave)}
            claseBoton="boton boton-primario boton-nuevo"
            contenidoBoton={<><Icono nombre="agregar" />Nuevo</>} />
        )}

        <BarraUsuario />
      </header>

      <main className={completa ? 'pagina-completa' : 'pagina'} id="contenido" tabIndex={-1}>
        <Componente key={`${paginaActual}-${params.vez ?? ''}`} params={params} onNavegar={navegar} />

        {!completa && (
          <footer className="pie-pagina">
            <span>FARO · Gestión del mantenimiento municipal</span>
            <span>Municipalidad de Estación General Paz · Córdoba, Argentina</span>
          </footer>
        )}
      </main>

      {/* En el celular las secciones bajan, al alcance del pulgar (en la compu esta barra no se muestra) */}
      <nav className="barra-inferior" aria-label="Secciones">
        {secciones.map((seccion) => (
          <a key={seccion.clave} href="#contenido"
            className={seccion.clave === paginaActual ? 'nav-abajo nav-abajo-activo' : 'nav-abajo'}
            aria-current={seccion.clave === paginaActual ? 'page' : undefined}
            onClick={(evento) => irA(evento, seccion.clave)}>
            <span className="nav-abajo-icono"><Icono nombre={seccion.icono} /></span>
            {seccion.titulo}
          </a>
        ))}
        {mas.length > 0 && (
          <MenuDesplegable haciaArriba opciones={mas} claveActual={paginaActual} onElegir={(clave) => navegar(clave)}
            claseBoton={estaEnMas(paginaActual) ? 'nav-abajo nav-abajo-activo' : 'nav-abajo'}
            contenidoBoton={<><span className="nav-abajo-icono"><Icono nombre="mas" /></span>Más</>} />
        )}
      </nav>
    </div>
  )
}

export default App