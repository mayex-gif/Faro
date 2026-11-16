import { useEffect, useRef, useState } from 'react'
import Icono from './Icono'
import { ayudaPara } from '../utils/ayuda'
import '../estilos-ayuda.css'

// El botón "?" de la barra de arriba: abre una hoja al costado (en el celular, a pantalla completa)
// que explica la pantalla que se está viendo. El contenido está en utils/ayuda.js.
// Se cierra con "Cerrar", tocando afuera o con Escape.
// Props: clave (la pantalla actual, ej. 'mapa' o 'login'), rol (para mostrar solo lo que esa persona puede hacer)
function BotonAyuda({ clave, rol }) {
  const [abierta, setAbierta] = useState(false)
  const ayuda = ayudaPara(clave, rol)
  if (!ayuda) return null

  return (
    <>
      <button type="button" className="boton-ayuda" onClick={() => setAbierta(true)}
        aria-haspopup="dialog" aria-label={`Ayuda: ${ayuda.titulo}`} title="¿Qué se hace en esta pantalla?">
        <span aria-hidden="true">?</span>
      </button>
      {abierta && <HojaAyuda ayuda={ayuda} onCerrar={() => setAbierta(false)} />}
    </>
  )
}

function HojaAyuda({ ayuda, onCerrar }) {
  const botonCerrar = useRef(null)

  // Al abrir: el foco va a "Cerrar"; al cerrar, vuelve al botón "?"
  useEffect(() => {
    const anterior = document.activeElement
    botonCerrar.current?.focus()
    return () => anterior?.focus?.()
  }, [])

  useEffect(() => {
    function alApretar(evento) {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alApretar)
    return () => document.removeEventListener('keydown', alApretar)
  }, [onCerrar])

  return (
    <div className="hoja-ayuda" onClick={(evento) => { if (evento.target === evento.currentTarget) onCerrar() }}>
      <div className="hoja-ayuda-contenido" role="dialog" aria-modal="true" aria-labelledby="titulo-hoja-ayuda">
        <div className="hoja-ayuda-encabezado">
          <div>
            <p className="sobre-titulo">AYUDA</p>
            <h2 id="titulo-hoja-ayuda">{ayuda.titulo}</h2>
          </div>
          <button type="button" ref={botonCerrar} className="boton boton-secundario" onClick={onCerrar}>
            <Icono nombre="cerrar" />Cerrar
          </button>
        </div>

        <p className="hoja-ayuda-resumen">{ayuda.resumen}</p>

        {ayuda.secciones.map((seccion) => (
          <section key={seccion.titulo} className="hoja-ayuda-seccion">
            <h3>{seccion.titulo}</h3>
            <ul>
              {seccion.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}

        {ayuda.consejo && (
          <p className="hoja-ayuda-consejo"><strong>Consejo: </strong>{ayuda.consejo}</p>
        )}

        <p className="hoja-ayuda-pie">¿Seguís con dudas? Consultá al encargado del corralón.</p>
      </div>
    </div>
  )
}

export default BotonAyuda
