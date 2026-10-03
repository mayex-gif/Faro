// Reglas para asignar órdenes de trabajo (OT) a cuadrillas. Son funciones puras: no tocan la pantalla.
import { PRIORIDADES } from './ordenesTrabajo.js'

// Las OT pendientes son las que están en el estado inicial del flujo (se lo pregunta al backend,
// no se escribe "Pendiente" a mano porque los estados son configurables).
// Orden: primero las más urgentes y, a igual prioridad, las más antiguas.
export function ordenesPendientes(ordenes, estados) {
  const inicialesIds = new Set(estados.filter((estado) => estado.inicial).map((estado) => estado.id))
  const peso = (prioridad) => PRIORIDADES.findIndex((opcion) => opcion.valor === prioridad)

  return ordenes
    .filter((orden) => inicialesIds.has(orden.estadoId))
    .sort((a, b) =>
      peso(b.prioridad) - peso(a.prioridad)
      || (a.fechaCreacion ?? '').localeCompare(b.fechaCreacion ?? '')
      || a.id - b.id)
}

// Las cuadrillas que saben hacer el tipo de trabajo de la OT: primero las disponibles, después por nombre.
export function cuadrillasParaOrden(orden, cuadrillas) {
  return cuadrillas
    .filter((cuadrilla) => (cuadrilla.tiposTrabajo ?? []).includes(orden.tipo))
    .sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.nombre.localeCompare(b.nombre, 'es'))
}
