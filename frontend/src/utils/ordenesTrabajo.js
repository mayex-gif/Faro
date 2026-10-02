// Valores posibles de una OT (tienen que coincidir con los enums del backend)
// y el texto que se le muestra al usuario.

export const TIPOS_TRABAJO = [
  { valor: 'PODA', etiqueta: 'Poda' },
  { valor: 'CORTE_DE_PASTO', etiqueta: 'Corte de pasto' },
  { valor: 'PINTURA', etiqueta: 'Pintura' },
  { valor: 'BACHEO', etiqueta: 'Bacheo' },
  { valor: 'LIMPIEZA', etiqueta: 'Limpieza' },
  { valor: 'ALUMBRADO', etiqueta: 'Alumbrado' },
  { valor: 'OTRO', etiqueta: 'Otro' },
]

export const ORIGENES = [
  { valor: 'RECLAMO_VECINAL', etiqueta: 'Reclamo vecinal' },
  { valor: 'PLAN_MANTENIMIENTO', etiqueta: 'Plan de mantenimiento' },
  { valor: 'ORDEN_DIRECTA', etiqueta: 'Orden directa' },
]

export const PRIORIDADES = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'URGENTE', etiqueta: 'Urgente' },
]

// Busca el texto para mostrar de un valor. Ej: etiqueta(TIPOS_TRABAJO, 'PODA') → 'Poda'
export function etiqueta(lista, valor) {
  return lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
}

// "2026-10-01T18:50:05" → "1/10/26, 18:50"
export function formatearFecha(fechaIso) {
  if (!fechaIso) return '—'
  return new Date(fechaIso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}