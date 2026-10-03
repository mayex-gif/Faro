// Funciones para hablar con el backend de Órdenes de Trabajo.
import { pedir } from './cliente'

const RUTA = '/ordenes-trabajo'

// GET: todas las OT, o solo las de un lugar si se pasa lugarId
export function listarOrdenes(lugarId) {
  return pedir(lugarId ? `${RUTA}?lugarId=${lugarId}` : RUTA)
}

// POST: crear una OT
export function crearOrden(orden) {
  return pedir(RUTA, { method: 'POST', body: JSON.stringify(orden) })
}

// PUT: modificar una OT
export function actualizarOrden(id, orden) {
  return pedir(`${RUTA}/${id}`, { method: 'PUT', body: JSON.stringify(orden) })
}

// PATCH: pasar una OT a otro estado. El backend responde 409 si ese cambio no está permitido.
export function cambiarEstadoOrden(id, estadoId) {
  return pedir(`${RUTA}/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estadoId }) })
}
