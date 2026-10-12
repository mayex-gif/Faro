// Funciones para hablar con el backend de Puntos de Infraestructura.
import { pedir } from './cliente'

const RUTA = '/infraestructura'

// GET: traer todos los puntos
export function listarPuntos() {
  return pedir(RUTA)
}

// POST: crear un punto nuevo
export function crearPunto(punto) {
  return pedir(RUTA, { method: 'POST', body: JSON.stringify(punto) })
}

// PUT: modificar un punto existente
export function actualizarPunto(id, punto) {
  return pedir(`${RUTA}/${id}`, { method: 'PUT', body: JSON.stringify(punto) })
}

// DELETE: borrar un punto
export function eliminarPunto(id) {
  return pedir(`${RUTA}/${id}`, { method: 'DELETE' })
}

// GET: la Ficha Histórica de un lugar (sus datos, el resumen de sus OT y la línea de tiempo).
// Responde 404 si el lugar no existe.
export function obtenerHistoria(id) {
  return pedir(`${RUTA}/${id}/historia`)
}