import { useId, useRef, useState } from 'react'
import { useDialogo } from '../hooks/useDialogo'
import { nuevoNumero } from '../offline/datosCola'
import { MAX_MOTIVO, armarCancelacion, hayErrores } from '../utils/cierreOrden'
import Icono from './Icono'
import '../estilos-cierre.css'

// El pop-up chico que sale al tocar "Cancelar" una OT (Trabajos o Mis tareas). Solo pide un motivo, opcional:
// si se escribe, se guarda como comentario de la OT ("Motivo de la cancelación: …"). Sin casilla, sin gasto, sin fotos.
// Las reglas están en utils/cierreOrden.js. Lo que se arma se le pasa a la página (onConfirmar), que lo manda.
// Se cierra con "Volver" o Escape (no tocando afuera). En el celular es una hoja que sube desde abajo.
// Props: orden, estado (al que pasa: Cancelada), enviando, error, onConfirmar({ cambio, comentario, numeroComentario }), onCerrar
function PopUpCancelar({ orden, estado, enviando = false, error = '', onConfirmar, onCerrar }) {
  const id = useId()
  const ventana = useRef(null)
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState({})
  // Número de comanda del comentario con el motivo: el mismo en cada reintento (no se duplica)
  const numeroComentario = useRef(nuevoNumero())

  useDialogo(ventana, { ocupado: enviando, onCerrar })

  function cancelar(evento) {
    evento.preventDefault()
    const armado = armarCancelacion(estado, motivo)
    setErrores(armado.errores)
    if (hayErrores(armado.errores)) {
      document.getElementById(`${id}-motivo`)?.focus()
      return
    }
    onConfirmar({ cambio: armado.cambio, comentario: armado.comentario, numeroComentario: numeroComentario.current })
  }

  return (
    <div className="popup-cierre popup-cierre-chico">
      <form ref={ventana} className="popup-ventana popup-chico" role="dialog" aria-modal="true"
        aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-ayuda`} onSubmit={cancelar} aria-busy={enviando} noValidate>
        <header className="popup-encabezado">
          <span className="numero-orden">OT #{orden.id}</span>
          <h2 id={`${id}-titulo`} tabIndex={-1}>¿Cancelar este trabajo?</h2>
          <p className="popup-orden">{orden.descripcion}</p>
          <p className="tarea-lugar"><Icono nombre="lugar" />{orden.lugarNombre}</p>
        </header>

        <div className="popup-cuerpo">
          <p id={`${id}-ayuda`} className="popup-ayuda">
            La orden pasa a “{estado.nombre}” y después ya no se va a poder modificar. El lugar queda como está.
          </p>
          <div className="campo">
            <label htmlFor={`${id}-motivo`}>Motivo <span className="opcional">(opcional)</span></label>
            <textarea id={`${id}-motivo`} rows={3} maxLength={MAX_MOTIVO} value={motivo} disabled={enviando}
              placeholder="Ej: Lo arregló la cooperativa eléctrica."
              aria-invalid={Boolean(errores.motivo)}
              aria-describedby={`${id}-contador${errores.motivo ? ` ${id}-error-motivo` : ''}`}
              onChange={(evento) => { setMotivo(evento.target.value); setErrores({}) }} />
            <p id={`${id}-contador`} className="ayuda-campo">
              {motivo.trim().length} / {MAX_MOTIVO} · Se guarda en “Comentarios y fotos” de la OT.
            </p>
            {errores.motivo && <p id={`${id}-error-motivo`} className="error-campo">{errores.motivo}</p>}
          </div>

          <div aria-live="assertive" aria-atomic="true">
            {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          </div>
        </div>

        <footer className="popup-pie">
          <button type="button" className="boton boton-secundario" onClick={onCerrar} disabled={enviando}>
            <Icono nombre="volver" />Volver
          </button>
          <button type="submit" className="boton boton-cancelar-ot" disabled={enviando}>
            {enviando ? <span className="indicador-carga" aria-hidden="true" /> : <Icono nombre="cerrar" />}
            {enviando ? 'Cancelando…' : 'Cancelar la OT'}
          </button>
        </footer>
      </form>
    </div>
  )
}

export default PopUpCancelar
