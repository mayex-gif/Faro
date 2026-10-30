import { useRef, useState } from 'react'
import { listarPuntos } from '../api/infraestructura'
import { listarOrdenes } from '../api/ordenesTrabajo'
import Icono from './Icono'
import { buscar } from '../utils/buscador'
import { etiquetaTipoLugar } from '../utils/lugares'

// Buscador de la barra superior: "Buscar un lugar, una calle o un trabajo…".
// Al escribir aparece una lista con los lugares y los trabajos que coinciden (ver utils/buscador.js).
// Elegir un lugar, o un trabajo, lleva al mapa con ese lugar elegido.
// Accesibilidad: es un "combobox" (WAI-ARIA): con las flechas se recorre la lista, Enter elige y Escape cierra;
// el foco se queda en el campo de texto y el lector de pantalla anuncia la opción marcada.
// Props: onElegirLugar(lugarId)
function Buscador({ onElegirLugar }) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState(null) // { lugares, ordenes } traídos del backend
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(false)
  const [activo, setActivo] = useState(-1) // posición de la opción marcada con las flechas
  const caja = useRef(null)

  // Cada vez que se entra al buscador se piden los datos de nuevo, así encuentra lo recién cargado.
  function cargar() {
    setCargando(true)
    Promise.all([listarPuntos(), listarOrdenes()])
      .then(([lugares, ordenes]) => {
        setDatos({ lugares, ordenes })
        setError(false)
      })
      .catch((e) => {
        console.error(e)
        setError(true)
      })
      .finally(() => setCargando(false))
  }

  const resultados = datos ? buscar(texto, datos.lugares, datos.ordenes) : { lugares: [], trabajos: [] }
  // Una sola lista con todas las opciones, en el orden en que se ven (para recorrerla con las flechas)
  const opciones = [
    ...resultados.lugares.map((lugar) => ({
      id: `buscador-lugar-${lugar.id}`, lugarId: lugar.id, titulo: lugar.nombre, detalle: etiquetaTipoLugar(lugar.tipo),
    })),
    ...resultados.trabajos.map((orden) => ({
      id: `buscador-ot-${orden.id}`,
      lugarId: orden.lugarId,
      titulo: orden.descripcion,
      detalle: [`OT #${orden.id}`, orden.lugarNombre, orden.estadoNombre].filter(Boolean).join(' · '),
    })),
  ]
  const cantidadLugares = resultados.lugares.length
  const mostrar = abierto && texto.trim() !== ''

  function elegir(opcion) {
    setTexto('')
    setAbierto(false)
    setActivo(-1)
    onElegirLugar(opcion.lugarId)
  }

  function alApretarTecla(evento) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (!mostrar || opciones.length === 0) {
        setAbierto(true)
        return
      }
      const paso = evento.key === 'ArrowDown' ? 1 : -1
      setActivo((anterior) => (anterior + paso + opciones.length) % opciones.length)
    } else if (evento.key === 'Enter' && mostrar && activo >= 0) {
      evento.preventDefault()
      elegir(opciones[activo])
    } else if (evento.key === 'Escape') {
      if (mostrar) setAbierto(false)
      else setTexto('')
    }
  }

  // Si el foco se va a otro lugar de la página, la lista se cierra.
  function alSalir(evento) {
    if (!caja.current?.contains(evento.relatedTarget)) setAbierto(false)
  }

  function opcion(item, posicion) {
    return (
      <div key={item.id} id={item.id} role="option" aria-selected={posicion === activo} className="buscador-opcion"
        onMouseDown={(evento) => evento.preventDefault()} // el foco se queda en el campo
        onMouseEnter={() => setActivo(posicion)} onClick={() => elegir(item)}>
        <strong>{item.titulo}</strong>
        <span>{item.detalle}</span>
      </div>
    )
  }

  let mensaje = null
  if (error) mensaje = 'No pudimos buscar. Revisá la conexión e intentá nuevamente.'
  else if (!datos && cargando) mensaje = 'Buscando…'
  else if (datos && opciones.length === 0) {
    mensaje = texto.trim().length < 2 ? 'Escribí al menos 2 letras.' : `No encontramos lugares ni trabajos con "${texto.trim()}".`
  }

  return (
    <div className="buscador" ref={caja} onBlur={alSalir}>
      <Icono nombre="buscar" />
      <label className="solo-lectores" htmlFor="buscador-barra">Buscar un lugar, una calle o un trabajo</label>
      <input id="buscador-barra" type="search" autoComplete="off" placeholder="Buscar un lugar, una calle o un trabajo…"
        role="combobox" aria-autocomplete="list" aria-expanded={mostrar && opciones.length > 0}
        aria-controls="buscador-resultados" aria-activedescendant={mostrar && activo >= 0 ? opciones[activo]?.id : undefined}
        value={texto} onKeyDown={alApretarTecla}
        onFocus={() => { setAbierto(true); cargar() }}
        onChange={(evento) => { setTexto(evento.target.value); setAbierto(true); setActivo(-1) }} />

      {mostrar && (
        <div className="buscador-resultados">
          {mensaje && <p className="buscador-vacio" role="status">{mensaje}</p>}
          <div id="buscador-resultados" role="listbox" aria-label="Resultados de la búsqueda" hidden={opciones.length === 0}>
            {cantidadLugares > 0 && (
              <div role="group" aria-labelledby="buscador-grupo-lugares">
                <p id="buscador-grupo-lugares" className="buscador-grupo">Lugares</p>
                {opciones.slice(0, cantidadLugares).map((item, posicion) => opcion(item, posicion))}
              </div>
            )}
            {opciones.length > cantidadLugares && (
              <div role="group" aria-labelledby="buscador-grupo-trabajos">
                <p id="buscador-grupo-trabajos" className="buscador-grupo">Trabajos</p>
                {opciones.slice(cantidadLugares).map((item, posicion) => opcion(item, cantidadLugares + posicion))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Buscador
