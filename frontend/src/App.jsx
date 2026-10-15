import { useEffect, useState } from 'react'
import Icono from './components/Icono'
import MenuDesplegable from './components/MenuDesplegable'
import PaginaInfraestructura from './pages/PaginaInfraestructura'
import PaginaOrdenes from './pages/PaginaOrdenes'
import PaginaAsignacion from './pages/PaginaAsignacion'
import PaginaMapa from './pages/PaginaMapa'
import PaginaFichaLugar from './pages/PaginaFichaLugar'
import PaginaMisTareas from './pages/PaginaMisTareas'
import { INICIO, MAS, NUEVO, SECCIONES, estaEnMas, tituloDe } from './utils/navegacion'
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
  // Qué pantalla se está mostrando y con qué datos (params: ej. { lugarId: 3 } para abrir la ficha de un lugar)
  const [vista, setVista] = useState({ clave: INICIO, params: {} })
  const paginaActual = vista.clave
  const Componente = PAGINAS[paginaActual]

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

  return (
    <div className="aplicacion">
      <a className="saltar-contenido" href="#contenido">Saltar al contenido</a>

      <header className="barra-superior">
        <div className="marca">
          <img src="/logo-faro.png" alt="" className="marca-logo" width="40" height="40" />
          <div>
            <span className="marca-nombre">FARO</span>
            <span className="marca-lugar">Estación General Paz</span>
          </div>
        </div>

        <nav className="nav-secciones" aria-label="Secciones">
          {SECCIONES.map((seccion) => (
            <a key={seccion.clave} href="#contenido"
              className={seccion.clave === paginaActual ? 'nav-enlace nav-enlace-activo' : 'nav-enlace'}
              aria-current={seccion.clave === paginaActual ? 'page' : undefined}
              onClick={(evento) => irA(evento, seccion.clave)}>
              {seccion.titulo}
            </a>
          ))}
          <MenuDesplegable opciones={MAS} claveActual={paginaActual} onElegir={(clave) => navegar(clave)}
            claseBoton={estaEnMas(paginaActual) ? 'nav-enlace nav-enlace-activo' : 'nav-enlace'}
            contenidoBoton={<>Más<Icono nombre="abajo" /></>} />
        </nav>

        {/* Siempre en el mismo lugar: crear algo nuevo no depende de en qué pantalla estés */}
        <MenuDesplegable opciones={NUEVO} onElegir={(clave) => navegar(clave)}
          claseBoton="boton boton-primario boton-nuevo"
          contenidoBoton={<><Icono nombre="agregar" />Nuevo</>} />
      </header>

      <main className="pagina" id="contenido" tabIndex={-1}>
        <Componente key={paginaActual} params={vista.params} onNavegar={navegar} />

        <footer className="pie-pagina">
          <span>FARO · Gestión del mantenimiento municipal</span>
          <span>Municipalidad de Estación General Paz · Córdoba, Argentina</span>
        </footer>
      </main>

      {/* En el celular las secciones bajan, al alcance del pulgar (en la compu esta barra no se muestra) */}
      <nav className="barra-inferior" aria-label="Secciones">
        {SECCIONES.map((seccion) => (
          <a key={seccion.clave} href="#contenido"
            className={seccion.clave === paginaActual ? 'nav-abajo nav-abajo-activo' : 'nav-abajo'}
            aria-current={seccion.clave === paginaActual ? 'page' : undefined}
            onClick={(evento) => irA(evento, seccion.clave)}>
            <span className="nav-abajo-icono"><Icono nombre={seccion.icono} /></span>
            {seccion.titulo}
          </a>
        ))}
        <MenuDesplegable haciaArriba opciones={MAS} claveActual={paginaActual} onElegir={(clave) => navegar(clave)}
          claseBoton={estaEnMas(paginaActual) ? 'nav-abajo nav-abajo-activo' : 'nav-abajo'}
          contenidoBoton={<><span className="nav-abajo-icono"><Icono nombre="mas" /></span>Más</>} />
      </nav>
    </div>
  )
}

export default App