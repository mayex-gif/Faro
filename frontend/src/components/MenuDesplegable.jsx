import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Icono from './Icono'

// Un botón que abre una lista corta de opciones: lo usan "+ Nuevo" y "Más".
// Se cierra al elegir una opción, con Escape, al tocar afuera o al salir con Tab.
// Es un "desplegable" simple (botón con aria-expanded + lista de botones): se recorre con Tab como el resto,
// y también con las flechas, Inicio y Fin (la flecha abajo desde el botón abre la lista y va a la primera opción).
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

  // Flechas, Inicio y Fin mueven el foco entre las opciones (con la lista abierta).
  function alMoverConTeclado(evento) {
    const teclas = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!teclas.includes(evento.key)) return
    const lista = [...(caja.current?.querySelectorAll('.menu-opcion') ?? [])]
    if (lista.length === 0) return
    evento.preventDefault()
    // Si la lista estaba cerrada, se muestra ya mismo: un botón oculto no puede recibir el foco.
    if (!abierto) flushSync(() => setAbierto(true))
    const actual = lista.indexOf(document.activeElement)
    let siguiente = 0
    if (evento.key === 'End') siguiente = lista.length - 1
    else if (evento.key === 'ArrowDown') siguiente = actual < 0 ? 0 : (actual + 1) % lista.length
    else if (evento.key === 'ArrowUp') siguiente = actual < 0 ? lista.length - 1 : (actual - 1 + lista.length) % lista.length
    lista[siguiente].focus()
  }

  function elegir(clave) {
    setAbierto(false)
    onElegir(clave)
  }

  return (
    <div ref={caja} className={haciaArriba ? 'menu-desplegable menu-hacia-arriba' : 'menu-desplegable'} onBlur={alSalirDelMenu} onKeyDown={alMoverConTeclado}>
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