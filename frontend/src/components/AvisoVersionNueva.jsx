import { useEffect, useState } from 'react'
import { EVENTO_VERSION_NUEVA, actualizarAhora, hayVersionNueva } from '../offline/registrar'

// Cartel "Hay una versión nueva de FARO" (después de un deploy, con FARO abierto).
// Recargar lo decide la persona: así nunca se pierde lo que estaba cargando en un formulario.
function AvisoVersionNueva() {
  const [visible, setVisible] = useState(false)
  const [actualizando, setActualizando] = useState(false)

  useEffect(() => {
    let vigente = true
    hayVersionNueva().then((hay) => { if (vigente && hay) setVisible(true) }).catch(() => {})
    function mostrar() { setVisible(true) }
    window.addEventListener(EVENTO_VERSION_NUEVA, mostrar)
    return () => {
      vigente = false
      window.removeEventListener(EVENTO_VERSION_NUEVA, mostrar)
    }
  }, [])

  if (!visible) return null

  function actualizar() {
    setActualizando(true)
    actualizarAhora().catch(() => window.location.reload())
  }

  return (
    <div className="aviso-version" role="status">
      <p><strong>Hay una versión nueva de FARO.</strong> Actualizá cuando termines lo que estás haciendo.</p>
      <div className="aviso-version-acciones">
        <button type="button" className="boton boton-primario" onClick={actualizar} disabled={actualizando}>
          {actualizando ? 'Actualizando…' : 'Actualizar'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => setVisible(false)} disabled={actualizando}>
          Más tarde
        </button>
      </div>
    </div>
  )
}

export default AvisoVersionNueva
