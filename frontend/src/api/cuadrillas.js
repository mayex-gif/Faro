// Funciones para hablar con el backend de Cuadrillas y asignarles órdenes de trabajo.
//
// CONTRATO PROVISORIO: el backend todavía no implementa estos endpoints.
// Está descripto en frontend/CONTRATO_CUADRILLAS.md para que quien lo desarrolle lo confirme o lo ajuste.
import { pedir } from './cliente'

// GET: todas las cuadrillas.
// Ej: [{ id: 1, nombre: 'Cuadrilla Verde', integrantes: 4, tiposTrabajo: ['PODA', 'CORTE_DE_PASTO'], disponible: true }, ...]
// "disponible" es true si la cuadrilla no está haciendo ningún trabajo en este momento.
export function listarCuadrillas() {
  return pedir('/cuadrillas')
}

// PATCH: asignar una OT a una cuadrilla.
// El backend es quien pasa la OT al estado siguiente (ej: Pendiente → En curso), según el flujo configurado.
// Responde la OT actualizada (con cuadrillaId, cuadrillaNombre y su nuevo estado).
// Responde 409 si la cuadrilla está ocupada, no cubre ese tipo de trabajo o la OT ya no está pendiente.
export function asignarCuadrilla(ordenId, cuadrillaId) {
  return pedir(`/ordenes-trabajo/${ordenId}/cuadrilla`, { method: 'PATCH', body: JSON.stringify({ cuadrillaId }) })
}
