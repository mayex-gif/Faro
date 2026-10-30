// Funciones para hablar con el backend de Cuadrillas: listarlas y asignarles o reasignarles órdenes de trabajo.
// El contrato está descripto en frontend/CONTRATO_CUADRILLAS.md.
import { pedir } from './cliente'

// GET: todas las cuadrillas.
// Ej: [{ id: 1, nombre: 'Cuadrilla Verde', integrantes: 4, tiposTrabajo: ['PODA', 'CORTE_DE_PASTO'], disponible: true }, ...]
// "disponible" es true si la cuadrilla está en servicio y puede recibir trabajos.
export function listarCuadrillas() {
  return pedir('/cuadrillas')
}

// PATCH: asignar una OT pendiente a una cuadrilla.
// El backend es quien pasa la OT al estado siguiente: "Planificada" (ya tiene cuadrilla, todavía no empezó).
// El capataz la pasa a "En curso" cuando arranca, desde Mis tareas.
// Responde la OT actualizada (con cuadrillaId, cuadrillaNombre y su nuevo estado).
// Responde 409 si la cuadrilla no está disponible, no cubre ese tipo de trabajo o la OT ya no está pendiente.
export function asignarCuadrilla(ordenId, cuadrillaId) {
  return pedir(`/ordenes-trabajo/${ordenId}/cuadrilla`, { method: 'PATCH', body: JSON.stringify({ cuadrillaId }) })
}

// PATCH: pasar una OT que ya tiene cuadrilla a OTRA cuadrilla. El estado de la OT no cambia.
// Responde la OT actualizada (con la cuadrilla nueva).
// Responde 409 si la OT está cerrada o no tiene cuadrilla, si es la misma cuadrilla,
// o si la nueva no está disponible o no cubre ese tipo de trabajo.
export function reasignarCuadrilla(ordenId, cuadrillaId) {
  return pedir(`/ordenes-trabajo/${ordenId}/reasignacion`, { method: 'PATCH', body: JSON.stringify({ cuadrillaId }) })
}