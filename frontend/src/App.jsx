import { useState } from 'react'
import Icono from './components/Icono'
import PaginaInfraestructura from './pages/PaginaInfraestructura'
import PaginaOrdenes from './pages/PaginaOrdenes'
import PaginaAsignacion from './pages/PaginaAsignacion'
import './App.css'

// Las pantallas de la aplicación. Para agregar una nueva, se suma acá.
const PAGINAS = {
  infraestructura: { titulo: 'Infraestructura', icono: 'infraestructura', Componente: PaginaInfraestructura },
  ordenes: { titulo: 'Órdenes de trabajo', icono: 'orden', Componente: PaginaOrdenes },
  asignacion: { titulo: 'Asignación a cuadrillas', icono: 'cuadrilla', Componente: PaginaAsignacion },
}

function App() {
  // Qué pantalla se está mostrando
  const [paginaActual, setPaginaActual] = useState('infraestructura')
  const { titulo, Componente } = PAGINAS[paginaActual]

  function irA(evento, clave) {
    evento.preventDefault() // evita el salto del enlace: cambiamos de pantalla nosotros
    setPaginaActual(clave)
    document.getElementById('contenido')?.focus() // el foco va al contenido nuevo (accesibilidad)
  }

  return (
    <div className="aplicacion">
      <a className="saltar-contenido" href="#contenido">Saltar al contenido</a>

      <aside className="barra-lateral" aria-label="Identidad y navegación de FARO">
        <div className="marca">
          <img src="/logo-faro.png" alt="" className="marca-logo" width="64" height="64" />
          <div>
            <span className="marca-nombre">FARO</span>
            <span className="marca-descripcion">Mantenimiento municipal</span>
          </div>
        </div>

        <nav aria-label="Navegación principal">
          <p className="nav-titulo">GESTIÓN DEL ESPACIO PÚBLICO</p>
          {Object.entries(PAGINAS).map(([clave, pagina]) => (
            <a key={clave} href="#contenido"
              className={clave === paginaActual ? 'nav-enlace nav-activo' : 'nav-enlace'}
              aria-current={clave === paginaActual ? 'page' : undefined}
              onClick={(evento) => irA(evento, clave)}>
              <Icono nombre={pagina.icono} />
              {pagina.titulo}
            </a>
          ))}
        </nav>

        <div className="municipio">
          <span className="municipio-linea" />
          <p>Municipalidad de<br /><strong>Estación General Paz</strong></p>
          <span>Córdoba, Argentina</span>
        </div>
      </aside>

      <div className="area-principal">
        <header className="barra-superior">
          <p>Gestión municipal <span aria-hidden="true">/</span> <strong>{titulo}</strong></p>
          <span className="etiqueta-contexto">Corralón municipal</span>
        </header>

        <main className="pagina" id="contenido" tabIndex={-1}>
          <Componente />

          <footer className="pie-pagina">
            <span>FARO · Gestión del mantenimiento municipal</span>
            <span>Estación General Paz</span>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App