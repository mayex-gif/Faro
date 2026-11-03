// Funciones para hablar con el backend del Motor de Mantenimiento Periódico: reglas de recurrencia
// (diaria, semanal, mensual), generación automática de Órdenes de Trabajo y desvíos planificado vs. ejecutado.
// Ver ReglaMantenimientoController.java. El alta, la edición, pausar/activar, borrar y ejecutar son solo
// para el encargado del corralón (403 con otro rol); consultar reglas y desvíos no tiene esa restricción.
import { pedir } from './cliente.js'

const RUTA = '/mantenimiento-reglas'

// GET: todas las reglas. filtros opcionales: { activa: true|false, lugarId }
export function listarReglas({ activa, lugarId } = {}) {
  const parametros = new URLSearchParams()
  if (activa !== undefined && activa !== null && activa !== '') parametros.set('activa', String(activa))
  if (lugarId) parametros.set('lugarId', String(lugarId))
  const consulta = parametros.toString()
  return pedir(`${RUTA}${consulta ? `?${consulta}` : ''}`)
}

// POST: crea la regla. Responde la regla creada (201).
export function crearRegla(datos) {
  return pedir(RUTA, { method: 'POST', body: JSON.stringify(datos) })
}

// PUT: modifica una regla existente. Responde la regla actualizada.
export function modificarRegla(id, datos) {
  return pedir(`${RUTA}/${id}`, { method: 'PUT', body: JSON.stringify(datos) })
}

// PATCH: pausa la regla (el motor programado deja de generar OT nuevas mientras esté pausada).
export function pausarRegla(id) {
  return pedir(`${RUTA}/${id}/pausar`, { method: 'PATCH' })
}

// PATCH: reanuda una regla pausada (si su próxima ejecución quedó en el pasado, se recalcula).
export function activarRegla(id) {
  return pedir(`${RUTA}/${id}/activar`, { method: 'PATCH' })
}

// DELETE: borra la regla. Responde 409 si ya generó alguna OT (en ese caso hay que pausarla, no se puede borrar).
export function eliminarRegla(id) {
  return pedir(`${RUTA}/${id}`, { method: 'DELETE' })
}

// POST: fuerza ya mismo la generación de la próxima OT de esta regla (sin esperar al CRON) y avanza su fecha.
export function ejecutarRegla(id, fecha) {
  return pedir(`${RUTA}/${id}/ejecutar${fecha ? `?fecha=${fecha}` : ''}`, { method: 'POST' })
}

// GET: desvíos (planificado vs. ejecutado) de todas las OT generadas por una regla puntual.
export function desviosDeRegla(id) {
  return pedir(`${RUTA}/${id}/desvios`)
}

// GET: consolidado municipal de desvíos de todo el mantenimiento periódico (todas las reglas juntas).
export function desviosGlobales() {
  return pedir(`${RUTA}/desvios`)
}
