import { useState } from 'react'
import { asignarCuadrilla } from '../api/cuadrillas'
import { cuadrillasParaOrden } from '../utils/asignacion'
import { TIPOS_TRABAJO, etiqueta } from '../utils/ordenesTrabajo'

// "Asignar cuadrilla" dentro de la tarjeta de un trabajo, en la ficha del lugar (pantalla Mapa).
// Primero es un botón; al tocarlo aparece un desplegable con las cuadrillas que hacen ese tipo de trabajo.
// Usa las mismas reglas (utils/asignacion.js) y el mismo pedido al backend que la pantalla Cuadrillas.
// Props:
// - orden: la OT pendiente y sin cuadrilla
// - cuadrillas / cargandoCuadrillas / errorCuadrillas: las cuadrillas que cargó la página
// - onAsignada(ordenActualizada, cuadrilla): el backend confirmó la asignación
function AsignarCuadrilla({ orden, cuadrillas, cargandoCuadrillas, errorCuadrillas, onAsignada }) {
  const [abierto, setAbierto] = useState(false)
  const [elegida, setElegida] = useState('')
  const [asignando, setAsignando] = useState(false)
  const [error, setError] = useState('')

  const compatibles = cuadrillasParaOrden(orden, cuadrillas)
  const tipo = etiqueta(TIPOS_TRABAJO, orden.tipo).toLowerCase()
  // Solo vale la elección si esa cuadrilla sigue disponible
  const cuadrillaElegida = compatibles.find((cuadrilla) => String(cuadrilla.id) === elegida && cuadrilla.disponible)
  const idCampo = `cuadrilla-panel-${orden.id}`

  let ayuda
  if (errorCuadrillas) ayuda = 'No se pudieron cargar las cuadrillas.'
  else if (cargandoCuadrillas) ayuda = 'Cargando cuadrillas…'
  else if (compatibles.length === 0) ayuda = `Ninguna cuadrilla realiza ${tipo}.`
  else if (!compatibles.some((cuadrilla) => cuadrilla.disponible)) ayuda = `Las cuadrillas de ${tipo} están ocupadas.`
  else ayuda = `Cuadrillas que realizan ${tipo}.`

  function asignar() {
    if (!cuadrillaElegida) return
    setAsignando(true)
    setError('')
    asignarCuadrilla(orden.id, cuadrillaElegida.id)
      .then((actualizada) => onAsignada(actualizada, cuadrillaElegida))
      .catch((e) => {
        console.error(e)
        // e.message trae el motivo que explica el backend (ej: la cuadrilla ya está ocupada)
        setError(e.message || 'No se pudo asignar la orden. Intentá nuevamente.')
        setAsignando(false)
      })
  }

  if (!abierto) {
    return (
      <button type="button" className="boton-asignar" onClick={() => setAbierto(true)}>
        Asignar cuadrilla
      </button>
    )
  }

  return (
    <div className="asignar-en-tarjeta">
      <div className="campo">
        <label htmlFor={idCampo}>Cuadrilla para la OT #{orden.id}</label>
        <select id={idCampo} value={cuadrillaElegida ? elegida : ''} aria-describedby={`ayuda-${idCampo}`}
          disabled={asignando || cargandoCuadrillas || Boolean(errorCuadrillas)}
          onChange={(evento) => setElegida(evento.target.value)}>
          <option value="">Elegir cuadrilla</option>
          {compatibles.map((cuadrilla) => (
            <option key={cuadrilla.id} value={cuadrilla.id} disabled={!cuadrilla.disponible}>
              {cuadrilla.nombre} ({cuadrilla.disponible ? 'disponible' : 'ocupada'})
            </option>
          ))}
        </select>
        <p className="ayuda-campo" id={`ayuda-${idCampo}`}>{ayuda}</p>
      </div>
      {error && <p className="error-campo" role="alert">{error}</p>}
      <div className="botones">
        <button type="button" className="boton boton-secundario" disabled={asignando}
          onClick={() => { setAbierto(false); setError('') }}>
          Cancelar
        </button>
        <button type="button" className="boton boton-primario" disabled={!cuadrillaElegida || asignando} onClick={asignar}>
          {asignando ? 'Asignando…' : 'Asignar'}
        </button>
      </div>
    </div>
  )
}

export default AsignarCuadrilla
