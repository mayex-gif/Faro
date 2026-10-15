import { useEffect, useId, useRef, useState } from 'react'
import Icono from './Icono'

// Un botón que abre una lista corta de opciones: lo usan "+ Nuevo" y "Más".
// Se cierra al elegir una opción, con Escape, al tocar afuera o al salir con Tab.
// Es un "desplegable" simple (botón con aria-expanded + lista de botones): se recorre con Tab como el resto.
// Props:
// - contenidoBoton: lo que se ve en el botón (texto y, si hace falta, un icono)
// - claseBoton: clases CSS del botón
// - opciones: [{ clave, titulo, icono }]
// - claveActual: la pantalla que se está viendo (esa opción queda marcada); puede faltar
// - onElegir(clave): se eligió una opción
// - haciaArriba: la lista se abre por encima del botón (barra de abajo del celular)
function MenuDesplegable({ contenidoBoton, claseBoton, opciones, claveActual, onElegir, haciaArriba = false }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)
  const boton = useRef(null)
  const idLista = useId()

  // Mientras está abierto, escuchamos toques afuera y la tecla Escape. Al cerrarse, se dejan de escuchar.
  useEffect(() => {
    if (!abierto) return
    function alTocarAfuera(evento) {
      if (!caja.current?.contains(evento.target)) setAbierto(false)
    }
    function alApretarTecla(evento) {
      if (evento.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus() // el foco vuelve al botón que abrió la lista
      }
    }
    document.addEventListener('pointerdown', alTocarAfuera)
    document.addEventListener('keydown', alApretarTecla)
    return () => {
      document.removeEventListener('pointerdown', alTocarAfuera)
      document.removeEventListener('keydown', alApretarTecla)
    }
  }, [abierto])

  // Si el foco se va a otro lugar de la página (Tab), la lista se cierra.
  function alSalirDelMenu(evento) {
    if (!caja.current?.contains(evento.relatedTarget)) setAbierto(false)
  }

  function elegir(clave) {
    setAbierto(false)
    onElegir(clave)
  }

  return (
    <div ref={caja} className={haciaArriba ? 'menu-desplegable menu-hacia-arriba' : 'menu-desplegable'} onBlur={alSalirDelMenu}>
      <button ref={boton} type="button" className={claseBoton}
        aria-expanded={abierto} aria-controls={idLista} onClick={() => setAbierto((anterior) => !anterior)}>
        {contenidoBoton}
      </button>
      <ul id={idLista} className="menu-opciones" hidden={!abierto}>
        {opciones.map((opcion) => (
          <li key={opcion.clave}>
            <button type="button" className="menu-opcion"
              aria-current={opcion.clave === claveActual ? 'page' : undefined}
              onClick={() => elegir(opcion.clave)}>
              <Icono nombre={opcion.icono} />
              {opcion.titulo}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MenuDesplegable