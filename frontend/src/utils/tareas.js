// Reglas de "Mis tareas" (el capataz, desde el celular). Funciones puras: no tocan la pantalla.
import { PRIORIDADES } from './ordenesTrabajo.js'

function pesoPrioridad(prioridad) {
  return PRIORIDADES.findIndex((opcion) => opcion.valor === prioridad)
}

// Las tareas de una cuadrilla son las órdenes que tiene asignadas y todavía no se cerraron.
// Primero las más urgentes y, a igual prioridad, las más antiguas.
// OJO: depende de que el backend informe "cuadrillaId" en cada OT (ver CONTRATO_CUADRILLAS.md).
export function tareasDeCuadrilla(ordenes, estados, cuadrillaId) {
  if (cuadrillaId == null || cuadrillaId === '') return []
  const cierre = new Set(estados.filter((estado) => estado.cierre).map((estado) => estado.id))

  return ordenes
    .filter((orden) => orden.cuadrillaId != null && Number(orden.cuadrillaId) === Number(cuadrillaId))
    .filter((orden) => !cierre.has(orden.estadoId))
    .sort((a, b) =>
      pesoPrioridad(b.prioridad) - pesoPrioridad(a.prioridad)
      || (a.fechaCreacion ?? '').localeCompare(b.fechaCreacion ?? '')
      || a.id - b.id)
}

// Qué puede hacer el capataz con una tarea, según los caminos que permite el flujo configurado en el backend.
// - No se ofrece volver a un estado inicial ("Pendiente"): eso lo decide quien coordina.
// - La acción "principal" es el primer paso hacia adelante en el orden del flujo
//   (ej: Planificada → En curso; En curso → Finalizada). Las demás quedan como "otras opciones".
// Convención a confirmar con el backend: el orden de GET /api/estados-orden es el orden del flujo.
export function accionesDeTarea(orden, estados) {
  const posicion = new Map(estados.map((estado, indice) => [estado.id, indice]))
  const actual = estados.find((estado) => estado.id === orden.estadoId)

  const destinos = (actual?.siguientes ?? [])
    .map((id) => estados.find((estado) => estado.id === id))
    .filter((estado) => estado && !estado.inicial)
    .sort((a, b) => posicion.get(a.id) - posicion.get(b.id))

  return { principal: destinos[0] ?? null, otras: destinos.slice(1) }
}

// Texto del botón. Sin nombres de estado escritos a mano: si el destino cierra la tarea es "Finalizar",
// si no, "Iniciar". Las otras opciones usan el nombre del estado que informa el backend.
export function textoAccion(estado, esPrincipal) {
  if (!esPrincipal) return `Pasar a ${estado.nombre}`
  return estado.cierre ? 'Finalizar tarea' : 'Iniciar tarea'
}
