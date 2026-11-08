import { useEffect, useRef } from 'react'
import Icono from './Icono'
import PanelComentarios from './PanelComentarios'

// Hoja que se abre al costado (en el celular, a pantalla completa) con el muro de una OT. La usa Trabajos.
// Se cierra con "Cerrar", tocando afuera o con Escape.
// Props: orden, onCerrar
function HojaComentarios({ orden, onCerrar }) {
  const botonCerrar = useRef(null)

  // Al abrir: el foco va a "Cerrar"; al cerrar, vuelve al botón que la abrió
  useEffect(() => {
    const anterior = document.activeElement
    botonCerrar.current?.focus()
    return () => anterior?.focus?.()
  }, [])

  useEffect(() => {
    function alApretar(evento) {
      // Si el visor de fotos está abierto, Escape cierra primero el visor
      if (evento.key === 'Escape' && !document.querySelector('.visor-fotos')) onCerrar()
    }
    document.addEventListener('keydown', alApretar)
    return () => document.removeEventListener('keydown', alApretar)
  }, [onCerrar])

  return (
    <div className="hoja-comentarios" onClick={(evento) => { if (evento.target === evento.currentTarget) onCerrar() }}>
      <div className="hoja-contenido" role="dialog" aria-modal="true" aria-labelledby="titulo-hoja-comentarios">
        <div className="hoja-encabezado">
          <div>
            <span className="numero-orden">OT #{orden.id}</span>
            <h2 id="titulo-hoja-comentarios">{orden.descripcion}</h2>
            <p className="tarea-lugar"><Icono nombre="lugar" />{orden.lugarNombre}</p>
          </div>
          <button type="button" ref={botonCerrar} className="boton boton-secundario" onClick={onCerrar}>
            <Icono nombre="cerrar" />Cerrar
          </button>
        </div>
        <PanelComentarios orden={orden} />
      </div>
    </div>
  )
}

export default HojaComentarios
