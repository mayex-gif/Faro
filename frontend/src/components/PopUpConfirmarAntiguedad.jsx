import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDialogo } from '../hooks/useDialogo'
import { antiguedadLuminaria, datosDeAntiguedad, preguntaCambioAntiguedad } from '../utils/luminarias'
import Icono from './Icono'
import '../estilos-cierre.css'

// El pop-up chico que pide confirmación antes de cambiar una luminaria de nueva a vieja (o al revés),
// "por si se equivocan". Lo usan la ficha de la luminaria (mapa) y el formulario de edición (Más → Luminarias).
// Se dibuja directo en <body> (createPortal): así no lo recorta el panel de la ficha (que en el celular se desliza)
// y no queda un formulario adentro de otro. Se cierra con "Volver" o Escape. En el celular es una hoja que sube desde abajo (mismos estilos que "Cancelar una OT").
// Props: lugar, nueva (a lo que pasa: true = Nueva, false = Vieja), enviando, error, onConfirmar(), onCerrar()
function PopUpConfirmarAntiguedad({ lugar, nueva, enviando = false, error = '', onConfirmar, onCerrar }) {
  const id = useId()
  const ventana = useRef(null)
  const actual = datosDeAntiguedad(antiguedadLuminaria(lugar))

  useDialogo(ventana, { ocupado: enviando, onCerrar })

  function confirmar(evento) {
    evento.preventDefault()
    evento.stopPropagation() // que no llegue al formulario de atrás (React pasa los eventos aunque esté en <body>)
    if (!enviando) onConfirmar()
  }

  return createPortal(
    <div className="popup-cierre popup-cierre-chico">
      <form ref={ventana} className="popup-ventana popup-chico" role="dialog" aria-modal="true"
        aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-ayuda`} onSubmit={confirmar} aria-busy={enviando} noValidate>
        <header className="popup-encabezado">
          <span className="numero-orden">Nueva o vieja</span>
          <h2 id={`${id}-titulo`} tabIndex={-1}>{preguntaCambioAntiguedad(lugar, nueva)}</h2>
        </header>

        <div className="popup-cuerpo">
          <p id={`${id}-ayuda`} className="popup-ayuda">
            {actual && <>Ahora figura como <strong>{actual.nombre}</strong>. </>}
            Se puede volver a cambiar. Si funciona o está apagada no cambia.
          </p>
          <div aria-live="assertive" aria-atomic="true">
            {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          </div>
        </div>

        <footer className="popup-pie">
          <button type="button" className="boton boton-secundario" onClick={onCerrar} disabled={enviando}>
            <Icono nombre="volver" />Volver
          </button>
          <button type="submit" className="boton boton-primario" disabled={enviando}>
            {enviando ? <span className="indicador-carga" aria-hidden="true" /> : <Icono nombre="guardar" />}
            {enviando ? 'Guardando…' : `Sí, marcar como ${nueva ? 'nueva' : 'vieja'}`}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  )
}

export default PopUpConfirmarAntiguedad
