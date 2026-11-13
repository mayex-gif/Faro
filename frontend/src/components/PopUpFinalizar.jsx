import { useId, useRef, useState } from 'react'
import { useDialogo } from '../hooks/useDialogo'
import { useFotosElegidas } from '../hooks/useFotosElegidas'
import { nuevoNumero } from '../offline/datosCola'
import { armarFinalizacion, casillaDelLugar, hayErrores, textoMontoDeclarado } from '../utils/cierreOrden'
import { MAX_TEXTO, contadorTexto, fotosQueQuedan } from '../utils/comentarios'
import Icono from './Icono'
import '../estilos-cierre.css'

// El pop-up que sale al tocar "Finalizar" en Trabajos o en Mis tareas (encargado y capataz). Todo es opcional:
// - la casilla "El lugar quedó funcionando" (solo si el lugar está Fuera de servicio),
// - el gasto adicional (debajo del monto que se declaró al crear la OT),
// - un comentario y fotos de evidencia (se guardan como un comentario de la OT).
// Las reglas están en utils/cierreOrden.js. Lo que se arma se le pasa a la página (onConfirmar), que lo manda.
// En la compu es una ventana en el medio; en el celular ocupa toda la pantalla.
// Se cierra con "Volver" o Escape (no tocando afuera: así no se pierde lo escrito por un toque sin querer).
// Props: orden, estado (al que pasa: Finalizada), lugar (o null si no se sabe), otrasAbiertas,
//        enviando, error (lo que contestó el servidor), onConfirmar({ cambio, comentario, numeroComentario }), onCerrar
function PopUpFinalizar({ orden, estado, lugar, otrasAbiertas = 0, enviando = false, error = '', onConfirmar, onCerrar }) {
  const id = useId()
  const ventana = useRef(null)
  const [casilla] = useState(() => casillaDelLugar(lugar, otrasAbiertas)) // se decide al abrir
  const [lugarFunciona, setLugarFunciona] = useState(casilla.marcada)
  const [gasto, setGasto] = useState('')
  const [comentario, setComentario] = useState('')
  const [errores, setErrores] = useState({})
  // Número de comanda del comentario: el mismo en cada reintento (si el primero había llegado, no se duplica)
  const numeroComentario = useRef(nuevoNumero())
  const inputCamara = useRef(null)
  const inputGaleria = useRef(null)
  const { fotos, preparando, problema, agregar, quitar } = useFotosElegidas()
  const ocupado = enviando || preparando

  // Foco, Escape, Tab y la página de atrás quieta (hooks/useDialogo.js)
  useDialogo(ventana, { ocupado: enviando, onCerrar })

  // Al corregir un campo, se borra su aviso de error
  function sinError(campo) {
    setErrores((anteriores) => {
      const nuevos = { ...anteriores }
      delete nuevos[campo]
      return nuevos
    })
  }

  function finalizar(evento) {
    evento.preventDefault()
    const armado = armarFinalizacion(estado, {
      casilla, lugarFunciona, gasto, comentario, fotos: fotos.map((foto) => foto.blob),
    })
    setErrores(armado.errores)
    if (hayErrores(armado.errores)) {
      // El foco va al primer campo con problema, para que se entienda qué corregir
      document.getElementById(armado.errores.gasto ? `${id}-gasto` : `${id}-comentario`)?.focus()
      return
    }
    onConfirmar({ cambio: armado.cambio, comentario: armado.comentario, numeroComentario: numeroComentario.current })
  }

  return (
    <div className="popup-cierre">
      <form ref={ventana} className="popup-ventana" role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-ayuda`} onSubmit={finalizar} aria-busy={ocupado} noValidate>
        <header className="popup-encabezado">
          <span className="numero-orden">OT #{orden.id}</span>
          <h2 id={`${id}-titulo`} tabIndex={-1}>Finalizar el trabajo</h2>
          <p className="popup-orden">{orden.descripcion}</p>
          <p className="tarea-lugar"><Icono nombre="lugar" />{orden.lugarNombre}</p>
        </header>

        <div className="popup-cuerpo">
          <p id={`${id}-ayuda`} className="popup-ayuda">Todo es opcional: si no completás nada, la orden se finaliza igual.</p>

          {casilla.mostrar && (
            <section className="popup-seccion" aria-label="Estado del lugar">
              <label className="campo-check popup-casilla" htmlFor={`${id}-funciona`}>
                <input id={`${id}-funciona`} type="checkbox" checked={lugarFunciona} disabled={enviando}
                  aria-describedby={casilla.aviso ? `${id}-aviso` : undefined}
                  onChange={(evento) => setLugarFunciona(evento.target.checked)} />
                <span>
                  <strong>El lugar quedó funcionando</strong>
                  <span>Hoy figura “Fuera de servicio”. Si lo marcás, vuelve a figurar como “Funciona”.</span>
                </span>
              </label>
              {casilla.aviso && (
                <p id={`${id}-aviso`} className="popup-aviso">
                  <strong>{casilla.aviso}.</strong> Marcalo solo si el lugar ya anda.
                </p>
              )}
            </section>
          )}

          <section className="popup-seccion" aria-labelledby={`${id}-titulo-gasto`}>
            <h3 id={`${id}-titulo-gasto`}>Gastos</h3>
            <p className="popup-monto">{textoMontoDeclarado(orden.montoAproximado)}</p>
            <div className="campo">
              <label htmlFor={`${id}-gasto`}>¿Hubo algún otro gasto a tener en cuenta? <span className="opcional">(opcional)</span></label>
              <div className="entrada-con-prefijo">
                <span aria-hidden="true">$</span>
                <input id={`${id}-gasto`} type="text" inputMode="decimal" autoComplete="off" placeholder="0"
                  value={gasto} disabled={enviando} aria-invalid={Boolean(errores.gasto)}
                  aria-describedby={`${id}-ayuda-gasto${errores.gasto ? ` ${id}-error-gasto` : ''}`}
                  onChange={(evento) => { setGasto(evento.target.value); sinError('gasto') }} />
              </div>
              <p id={`${id}-ayuda-gasto`} className="ayuda-campo">Por ejemplo: nafta, materiales o repuestos que no estaban previstos.</p>
              {errores.gasto && <p id={`${id}-error-gasto`} className="error-campo">{errores.gasto}</p>}
            </div>
          </section>

          <section className="popup-seccion" aria-labelledby={`${id}-titulo-evidencia`}>
            <h3 id={`${id}-titulo-evidencia`}>Evidencia del trabajo</h3>
            <div className="campo">
              <label htmlFor={`${id}-comentario`}>Comentario <span className="opcional">(opcional)</span></label>
              <textarea id={`${id}-comentario`} rows={3} maxLength={MAX_TEXTO} value={comentario} disabled={enviando}
                placeholder="Ej: Se cambió la lámpara. Falta pintar el poste."
                aria-invalid={Boolean(errores.comentario)}
                aria-describedby={`${id}-contador${errores.comentario ? ` ${id}-error-comentario` : ''}`}
                onChange={(evento) => { setComentario(evento.target.value); sinError('comentario') }} />
              <p id={`${id}-contador`} className="ayuda-campo">{contadorTexto(comentario)} · Se guarda en “Comentarios y fotos” de la OT.</p>
              {errores.comentario && <p id={`${id}-error-comentario`} className="error-campo">{errores.comentario}</p>}
            </div>

            {fotos.length > 0 && (
              <ul className="popup-fotos" aria-label="Fotos para agregar">
                {fotos.map((foto, indice) => (
                  <li key={foto.clave}>
                    <img src={foto.vista} alt={`Foto ${indice + 1} para agregar`} />
                    <button type="button" className="boton-quitar-foto" onClick={() => quitar(foto.clave)}
                      disabled={enviando} aria-label={`Quitar la foto ${indice + 1}`}>
                      <Icono nombre="cerrar" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* "Sacar foto" abre la cámara del celular; "Elegir fotos", la galería (en la compu, el explorador) */}
            <input ref={inputCamara} type="file" accept="image/*" capture="environment" hidden onChange={agregar} />
            <input ref={inputGaleria} type="file" accept="image/*" multiple hidden onChange={agregar} />
            <div className="popup-botones-fotos">
              <button type="button" className="boton boton-secundario" disabled={ocupado || fotosQueQuedan(fotos.length) === 0}
                onClick={() => inputCamara.current?.click()}>
                <Icono nombre="camara" />Sacar foto
              </button>
              <button type="button" className="boton boton-secundario" disabled={ocupado || fotosQueQuedan(fotos.length) === 0}
                onClick={() => inputGaleria.current?.click()}>
                <Icono nombre="foto" />Elegir fotos
              </button>
            </div>
            <p className="ayuda-campo" aria-live="polite">
              {preparando ? 'Preparando fotos…' : problema || 'Hasta 5 fotos. Se achican antes de enviarlas.'}
            </p>
          </section>

          <div aria-live="assertive" aria-atomic="true">
            {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          </div>
        </div>

        <footer className="popup-pie">
          <button type="button" className="boton boton-secundario" onClick={onCerrar} disabled={enviando}>
            <Icono nombre="volver" />Volver
          </button>
          <button type="submit" className="boton boton-primario" disabled={ocupado}>
            {enviando ? <span className="indicador-carga" aria-hidden="true" /> : <Icono nombre="guardar" />}
            {enviando ? 'Finalizando…' : 'Finalizar la OT'}
          </button>
        </footer>
      </form>
    </div>
  )
}

export default PopUpFinalizar
