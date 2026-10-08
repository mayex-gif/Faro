// Ficha Histórica de un lugar: arma la línea de tiempo con las órdenes de trabajo del lugar.
// Funciones puras: no tocan la pantalla.

// El backend todavía no guarda cuándo se inició ni cuándo se terminó cada OT (solo fechaCreacion).
// Si más adelante agrega "fechaInicio" y "fechaFin", la ficha las usa sin cambios.
export function fechaDelHito(orden) {
  return orden.fechaFin ?? orden.fechaInicio ?? orden.fechaCreacion ?? ''
}

// vista: 'todas' | 'abiertas' | 'cerradas'. Lo más reciente arriba.
export function lineaDeTiempo(ordenes, estados, vista = 'todas') {
  const estadosPorId = new Map(estados.map((estado) => [estado.id, estado]))

  return ordenes
    .map((orden) => {
      const estado = estadosPorId.get(orden.estadoId)
      return { orden, cerrada: Boolean(estado?.cierre), fecha: fechaDelHito(orden) }
    })
    .filter((item) => vista === 'todas' || (vista === 'cerradas') === item.cerrada)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.orden.id - a.orden.id)
}

// Números para el encabezado de la ficha.
export function resumenDeHistorial(ordenes, estados) {
  const cierre = new Set(estados.filter((estado) => estado.cierre).map((estado) => estado.id))
  const cerradas = ordenes.filter((orden) => cierre.has(orden.estadoId)).length
  return { total: ordenes.length, cerradas, abiertas: ordenes.length - cerradas }
}
