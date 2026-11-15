import { useState } from 'react'
import { actualizarPunto } from '../api/infraestructura'
import { MuestraPoste } from './PanelLuminarias'
import PopUpConfirmarAntiguedad from './PopUpConfirmarAntiguedad'
import {
  ESTADOS_A_MANO, antiguedadLuminaria, datosDeAntiguedad, datosDelEstado, estadoAMano, estadoLuminaria, pedidoParaAntiguedad,
  pedidoParaEstado, textoDelError,
} from '../utils/luminarias'

// Sección "Estado de la luminaria" en la ficha del lugar (pantalla Mapa). Muestra cómo está y, si el usuario
// puede (encargado), deja cambiarla en el momento:
// - Instalada: Funciona o Apagada. "En arreglo" no se elige: es una apagada que ya tiene una OT abierta
//   (se llega con "Crear OT de arreglo") y, cuando esa OT se finaliza, el backend la vuelve a "Funciona" solo.
// - A futuro (la planificó el intendente): no lleva OT; cuando la ponen, "Marcar como instalada" la deja funcionando
//   (y el backend la deja como Nueva).
// - Nueva o vieja: se muestra cuál es y el encargado la puede cambiar ("Marcar como vieja/nueva"), con un pop-up
//   de confirmación por si se equivocan.
// Props:
// - resumen: { lugar, ordenes (las abiertas), principal } de la luminaria
// - puedeCambiar: true si puede cambiar el estado (utils/permisos.js → puedeCambiarEstadoLuminaria)
// - puedeCrearOT: true si puede crear órdenes
// - onCambiado(lugarActualizado): el backend guardó el cambio (la página actualiza el mapa y el panel)
// - onNuevaOrden(lugarId): abre el formulario de OT con esta luminaria elegida
function EstadoLuminaria({ resumen, puedeCambiar, puedeCrearOT, onCambiado, onNuevaOrden }) {
  const { lugar, principal } = resumen
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const estado = estadoLuminaria(resumen)
  const datos = datosDelEstado(estado)
  const marcado = estadoAMano(lugar)
  const aFuturo = estado === 'falta'
  const antiguedad = antiguedadLuminaria(lugar)
  const datosAntiguedad = datosDeAntiguedad(antiguedad)
  // A qué se quiere pasar (true = Nueva, false = Vieja) mientras está abierto el pop-up de confirmación; null = cerrado
  const [cambioAntiguedad, setCambioAntiguedad] = useState(null)
  const [errorAntiguedad, setErrorAntiguedad] = useState('')

  async function cambiar(clave, textoAviso) {
    if ((clave === marcado && !aFuturo) || guardando) return
    setGuardando(true)
    setError('')
    setAviso('')
    try {
      const actualizado = await actualizarPunto(lugar.id, pedidoParaEstado(lugar, clave))
      onCambiado(actualizado)
      setAviso(textoAviso ?? `Se guardó: "${datosDelEstado(clave).nombre}".`)
    } catch (e) {
      console.error(e)
      setError(textoDelError(e, 'No se pudo cambiar el estado: revisá la conexión e intentá de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  function pedirCambioAntiguedad(nueva) {
    setAviso('')
    setError('')
    setErrorAntiguedad('')
    setCambioAntiguedad(nueva)
  }

  async function confirmarAntiguedad() {
    const nueva = cambioAntiguedad
    setGuardando(true)
    setErrorAntiguedad('')
    try {
      const actualizado = await actualizarPunto(lugar.id, pedidoParaAntiguedad(lugar, nueva))
      onCambiado(actualizado)
      setCambioAntiguedad(null)
      setAviso(`Listo: quedó marcada como ${nueva ? 'nueva' : 'vieja'}.`)
    } catch (e) {
      console.error(e)
      setErrorAntiguedad(textoDelError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="panel-lugar-seccion estado-luminaria" aria-labelledby="titulo-estado-luminaria">
      <h3 id="titulo-estado-luminaria">Estado de la luminaria</h3>
      <p className="estado-luminaria-actual">
        <MuestraPoste estado={estado} />
        <span><strong>{datos.nombre}</strong> · {datos.descripcion}</span>
      </p>

      {aFuturo ? (
        <>
          <p className="luminarias-ayuda">
            Es una luminaria a futuro: no se le pueden asignar órdenes de trabajo. Cuando la pongan, marcala como instalada
            (queda como nueva).
          </p>
          {puedeCambiar && (
            <button type="button" className="boton boton-primario" disabled={guardando} aria-busy={guardando}
              onClick={() => cambiar('funciona', 'Listo: la luminaria quedó instalada, funcionando y marcada como nueva.')}>
              {guardando ? 'Guardando…' : 'Marcar como instalada'}
            </button>
          )}
        </>
      ) : (
        <>
          {puedeCambiar && (
            <fieldset className="opciones-estado-luminaria" disabled={guardando} aria-busy={guardando}>
              <legend>Cambiar a</legend>
              {ESTADOS_A_MANO.map((clave) => (
                <label key={clave} className={clave === marcado ? 'opcion-estado-luminaria opcion-estado-luminaria-marcada' : 'opcion-estado-luminaria'}>
                  <input type="radio" name={`estado-luminaria-${lugar.id}`} value={clave} checked={clave === marcado}
                    onChange={() => cambiar(clave)} />
                  <MuestraPoste estado={clave} />
                  {datosDelEstado(clave).nombre}
                </label>
              ))}
            </fieldset>
          )}
          {estado === 'arreglo' && principal && (
            <p className="luminarias-ayuda">Tiene la OT #{principal.id} abierta. Cuando se finalice, vuelve sola a "Funciona".</p>
          )}
          {estado === 'apagada' && puedeCrearOT && (
            <button type="button" className="boton boton-secundario" onClick={() => onNuevaOrden(lugar.id)}>Crear OT de arreglo</button>
          )}
          {datosAntiguedad && (
            <div className="antiguedad-luminaria">
              <h4>Nueva o vieja</h4>
              <p className="estado-luminaria-actual">
                <span className={`muestra-cabezal muestra-cabezal-${antiguedad}`} aria-hidden="true" />
                <span><strong>{datosAntiguedad.nombre}</strong> · {datosAntiguedad.descripcion}</span>
              </p>
              {puedeCambiar && (antiguedad === 'sinMarcar' ? (
                <div className="botones-antiguedad">
                  <button type="button" className="boton boton-secundario" disabled={guardando} onClick={() => pedirCambioAntiguedad(true)}>Es nueva</button>
                  <button type="button" className="boton boton-secundario" disabled={guardando} onClick={() => pedirCambioAntiguedad(false)}>Es vieja</button>
                </div>
              ) : (
                <button type="button" className="boton boton-secundario" disabled={guardando}
                  onClick={() => pedirCambioAntiguedad(antiguedad !== 'nueva')}>
                  {antiguedad === 'nueva' ? 'Marcar como vieja' : 'Marcar como nueva'}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <p className="estado-luminaria-aviso" role="status" aria-live="polite">{aviso}</p>
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      {cambioAntiguedad !== null && (
        <PopUpConfirmarAntiguedad lugar={lugar} nueva={cambioAntiguedad} enviando={guardando} error={errorAntiguedad}
          onConfirmar={confirmarAntiguedad} onCerrar={() => setCambioAntiguedad(null)} />
      )}
    </section>
  )
}

export default EstadoLuminaria
