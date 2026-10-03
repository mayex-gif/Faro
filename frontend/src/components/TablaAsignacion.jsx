import { useState } from 'react'
import Icono from './Icono'
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta, formatearFecha } from '../utils/ordenesTrabajo'
import { cuadrillasParaOrden } from '../utils/asignacion'

// Una fila: guarda la cuadrilla elegida hasta que se toca "Asignar".
// Si la asignación falla, la elección se conserva para volver a intentar.
function FilaAsignacion({ orden, cuadrillas, errorCuadrillas, cargandoCuadrillas, asignando, deshabilitada, onAsignar }) {
  const [elegida, setElegida] = useState('')
  const compatibles = cuadrillasParaOrden(orden, cuadrillas)
  const hayDisponible = compatibles.some((cuadrilla) => cuadrilla.disponible)
  const tipo = etiqueta(TIPOS_TRABAJO, orden.tipo)

  // Solo vale la elección si esa cuadrilla sigue disponible (pudo ocuparse después de un intento fallido)
  const cuadrillaElegida = compatibles.find((cuadrilla) => String(cuadrilla.id) === elegida && cuadrilla.disponible)

  let ayuda
  if (errorCuadrillas) ayuda = 'No se pudieron cargar las cuadrillas.'
  else if (cargandoCuadrillas) ayuda = 'Cargando cuadrillas…'
  else if (compatibles.length === 0) ayuda = `Ninguna cuadrilla realiza ${tipo.toLowerCase()}.`
  else if (!hayDisponible) ayuda = `Las cuadrillas de ${tipo.toLowerCase()} están ocupadas.`
  else ayuda = `Cuadrillas que realizan ${tipo.toLowerCase()}.`

  function asignar() {
    if (cuadrillaElegida) onAsignar(orden, cuadrillaElegida)
  }

  return (
    <tr>
      <th scope="row">
        <span className="nombre-lugar">{orden.descripcion}</span>
        <span className="numero-orden">OT #{orden.id}</span>
      </th>
      <td>{orden.lugarNombre}</td>
      <td><span className="tipo-lugar">{tipo}</span></td>
      <td>
        <span className={`estado prioridad-${orden.prioridad.toLowerCase()}`}>
          <span className="estado-punto" aria-hidden="true" />
          {etiqueta(PRIORIDADES, orden.prioridad)}
        </span>
      </td>
      <td className="fecha-tabla">{formatearFecha(orden.fechaCreacion)}</td>
      <td className="celda-asignar">
        <div className="campo">
          <label className="solo-lectores" htmlFor={`cuadrilla-orden-${orden.id}`}>
            Cuadrilla para la orden {orden.id}
          </label>
          <select id={`cuadrilla-orden-${orden.id}`} value={cuadrillaElegida ? elegida : ''}
            onChange={(evento) => setElegida(evento.target.value)}
            aria-describedby={`ayuda-cuadrilla-${orden.id}`}
            disabled={asignando || deshabilitada || errorCuadrillas || cargandoCuadrillas || compatibles.length === 0}>
            <option value="">Elegir cuadrilla</option>
            {compatibles.map((cuadrilla) => (
              <option key={cuadrilla.id} value={cuadrilla.id} disabled={!cuadrilla.disponible}>
                {cuadrilla.nombre} ({cuadrilla.disponible ? 'disponible' : 'ocupada'})
              </option>
            ))}
          </select>
          <p className="ayuda-campo" id={`ayuda-cuadrilla-${orden.id}`}>{ayuda}</p>
        </div>
        <button type="button" className="boton boton-primario" onClick={asignar}
          disabled={!cuadrillaElegida || asignando || deshabilitada}
          aria-label={`Asignar la orden ${orden.id} a la cuadrilla elegida`}>
          <Icono nombre="guardar" />{asignando ? 'Asignando…' : 'Asignar'}
        </button>
      </td>
    </tr>
  )
}

// Props:
// - ordenes: las OT pendientes a mostrar (ya filtradas y ordenadas)
// - cuadrillas: todas las cuadrillas; errorCuadrillas / cargandoCuadrillas: si no se pudieron cargar o todavía se están cargando
// - onAsignar(orden, cuadrilla): se llama al tocar "Asignar"
// - idAsignando: id de la OT que se está asignando (mientras tanto se bloquea toda la tabla)
// - sinCoincidencias: true si hay pendientes pero los filtros las ocultan todas
function TablaAsignacion({ ordenes, cuadrillas, errorCuadrillas, cargandoCuadrillas, onAsignar, idAsignando, sinCoincidencias, onLimpiarFiltros }) {
  if (ordenes.length === 0) {
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="orden" /></span>
        <h3>{sinCoincidencias ? 'Ninguna orden pendiente coincide con los filtros' : 'No hay órdenes pendientes de asignar'}</h3>
        <p>{sinCoincidencias
          ? 'Probá con otros criterios o limpiá los filtros para ver todas las órdenes pendientes.'
          : 'Cuando se registre una orden nueva, va a aparecer acá para asignarla a una cuadrilla.'}</p>
        {sinCoincidencias && (
          <button type="button" className="boton boton-secundario" onClick={onLimpiarFiltros}>
            Ver todas las pendientes
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla-asignacion">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-pendientes"
        aria-describedby="ayuda-tabla-asignacion" tabIndex={0}>
        <table className="tabla tabla-asignacion">
          <caption className="solo-lectores">Órdenes pendientes de asignar a una cuadrilla</caption>
          <thead>
            <tr>
              <th scope="col">Trabajo</th>
              <th scope="col">Lugar</th>
              <th scope="col">Tipo</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Creada</th>
              <th scope="col">Asignar a</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => (
              <FilaAsignacion key={orden.id} orden={orden} cuadrillas={cuadrillas}
                errorCuadrillas={errorCuadrillas} cargandoCuadrillas={cargandoCuadrillas} onAsignar={onAsignar}
                asignando={orden.id === idAsignando} deshabilitada={idAsignando != null && orden.id !== idAsignando} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaAsignacion
