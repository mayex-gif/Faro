import { useEffect, useRef, useState } from 'react'
import FotoProtegida from './FotoProtegida'
import Icono from './Icono'
import { descripcionFoto } from '../utils/comentarios'

// Muestra las fotos de un comentario en grande, una por una.
// Se cierra con "Cerrar", tocando afuera o con Escape; las flechas del teclado pasan de foto.
// Props: comentario, indiceInicial, onCerrar
function VisorFotos({ comentario, indiceInicial = 0, onCerrar }) {
  const [indice, setIndice] = useState(indiceInicial)
  const botonCerrar = useRef(null)
  const total = comentario.fotos.length
  const foto = comentario.fotos[indice]

  useEffect(() => {
    const anterior = document.activeElement // para devolver el foco al cerrar
    botonCerrar.current?.focus()
    return () => anterior?.focus?.()
  }, [])

  useEffect(() => {
    function alApretar(evento) {
      if (evento.key === 'Escape') onCerrar()
      if (evento.key === 'ArrowLeft') setIndice((i) => Math.max(0, i - 1))
      if (evento.key === 'ArrowRight') setIndice((i) => Math.min(total - 1, i + 1))
    }
    document.addEventListener('keydown', alApretar)
    return () => document.removeEventListener('keydown', alApretar)
  }, [onCerrar, total])

  return (
    <div className="visor-fotos" role="dialog" aria-modal="true" aria-label={descripcionFoto(comentario, indice)}
      onClick={(evento) => { if (evento.target === evento.currentTarget) onCerrar() }}>
      <div className="visor-barra">
        <span>Foto {indice + 1} de {total}</span>
        <button type="button" ref={botonCerrar} className="boton boton-secundario" onClick={onCerrar}>
          <Icono nombre="cerrar" />Cerrar
        </button>
      </div>
      <FotoProtegida key={foto.id} fotoId={foto.id} descripcion={descripcionFoto(comentario, indice)} className="visor-imagen" />
      {total > 1 && (
        <div className="visor-flechas">
          <button type="button" className="boton boton-secundario" disabled={indice === 0}
            onClick={() => setIndice(indice - 1)}>
            <Icono nombre="anterior" />Anterior
          </button>
          <button type="button" className="boton boton-secundario" disabled={indice === total - 1}
            onClick={() => setIndice(indice + 1)}>
            Siguiente<Icono nombre="siguiente" />
          </button>
        </div>
      )}
    </div>
  )
}

export default VisorFotos
