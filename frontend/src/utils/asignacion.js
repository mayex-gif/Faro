// Reglas para asignar y reasignar órdenes de trabajo (OT) a cuadrillas. Son funciones puras: no tocan la pantalla.
import { PRIORIDADES } from './ordenesTrabajo.js'

// Primero las más urgentes y, a igual prioridad, las más antiguas (y si empatan, por número de OT).
function porUrgencia(a, b) {
  const peso = (prioridad) => PRIORIDADES.findIndex((opcion) => opcion.valor === prioridad)
  return peso(b.prioridad) - peso(a.prioridad)
    || (a.fechaCreacion ?? '').localeCompare(b.fechaCreacion ?? '')
    || a.id - b.id
}

// Las OT pendientes son las que están en el estado inicial del flujo (se lo pregunta al backend,
// no se escribe "Pendiente" a mano porque los estados son configurables).
// Orden: primero las más urgentes y, a igual prioridad, las más antiguas.
export function ordenesPendientes(ordenes, estados) {
  const inicialesIds = new Set(estados.filter((estado) => estado.inicial).map((estado) => estado.id))

  return ordenes
    .filter((orden) => inicialesIds.has(orden.estadoId))
    .sort(porUrgencia)
}

// Las OT que se pueden reasignar: las que ya tienen cuadrilla y no están cerradas (Finalizada, Cancelada).
// Es la misma regla que controla el backend. Sin los estados no se sabe cuáles están cerradas: lista vacía.
// Orden: primero las más urgentes y, a igual prioridad, las más antiguas.
export function ordenesAsignadas(ordenes, estados) {
  if (estados.length === 0) return []
  const cierreIds = new Set(estados.filter((estado) => estado.cierre).map((estado) => estado.id))

  return ordenes
    .filter((orden) => orden.cuadrillaId != null && !cierreIds.has(orden.estadoId))
    .sort(porUrgencia)
}

// Las cuadrillas que saben hacer el tipo de trabajo de la OT: primero las disponibles, después por nombre.
export function cuadrillasParaOrden(orden, cuadrillas) {
  return cuadrillas
    .filter((cuadrilla) => (cuadrilla.tiposTrabajo ?? []).includes(orden.tipo))
    .sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.nombre.localeCompare(b.nombre, 'es'))
}

// Para reasignar: las mismas cuadrillas que para asignar, menos la que ya tiene la OT.
export function cuadrillasParaReasignar(orden, cuadrillas) {
  return cuadrillasParaOrden(orden, cuadrillas)
    .filter((cuadrilla) => Number(cuadrilla.id) !== Number(orden.cuadrillaId))
}