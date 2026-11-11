import { useState } from 'react'
import { actualizarPunto } from '../api/infraestructura'
import { MuestraPoste } from './PanelLuminarias'
import { ESTADOS_A_MANO, datosDelEstado, estadoAMano, estadoLuminaria, pedidoParaEstado } from '../utils/luminarias'

// Sección "Estado de la luminaria" en la ficha del lugar (pantalla Mapa). Muestra cómo está y, si el usuario
// puede (encargado), deja cambiarla en el momento: Funciona, Apagada o Falta poner.
// "En arreglo" no se elige: es una luminaria apagada que ya tiene una OT abierta. Se llega con "Crear OT de arreglo"
// y, cuando esa OT se finaliza, el backend la vuelve a "Funciona" solo.
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

  async function cambiar(clave) {
    if (clave === marcado || guardando) return
    setGuardando(true)
    setError('')
    setAviso('')
    try {
      const actualizado = await actualizarPunto(lugar.id, pedidoParaEstado(lugar, clave))
      onCambiado(actualizado)
      setAviso(`Se guardó: "${datosDelEstado(clave).nombre}".`)
    } catch (e) {
      console.error(e)
      setError(e?.message || 'No se pudo cambiar el estado. Intentá de nuevo.')
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
      {estado === 'falta' && (
        <p className="luminarias-ayuda">Cuando se finalice la OT de instalación, queda como "Funciona".</p>
      )}
      {(estado === 'apagada' || estado === 'falta') && puedeCrearOT && (
        <button type="button" className="boton boton-secundario" onClick={() => onNuevaOrden(lugar.id)}>
          {estado === 'apagada' ? 'Crear OT de arreglo' : 'Crear OT de instalación'}
        </button>
      )}

      <p className="estado-luminaria-aviso" role="status" aria-live="polite">{aviso}</p>
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
    </section>
  )
}

export default EstadoLuminaria
