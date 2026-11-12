// Pestaña Calles del mapa: solo las calles y sus trabajos abiertos.
// Son funciones puras: reciben los resúmenes de utils/mapa.js (agruparPorLugar) y no tocan la pantalla.
import { ordenarResumenes } from './mapa.js'
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta } from './ordenesTrabajo.js'

export const TIPO_CALLE = 'CALLE'

export function esCalle(lugar) {
  return lugar?.tipo === TIPO_CALLE
}

// Solo las calles, con trabajos primero (las más urgentes arriba) y el resto por nombre.
export function callesDe(resumenes) {
  return ordenarResumenes(resumenes.filter((resumen) => esCalle(resumen.lugar)))
}

// Los números de arriba del panel.
export function resumirCalles(calles) {
  const conTrabajos = calles.filter((resumen) => resumen.principal).length
  return {
    total: calles.length,
    conTrabajos,
    sinTrabajos: calles.length - conTrabajos,
    fueraDeServicio: calles.filter((resumen) => resumen.lugar.estadoOperativo === false).length,
  }
}

// "Ortiz y Herrera" se encuentra escribiendo "ortiz", "herrera" o "ORTIZ Y"; "Velez" encuentra "Vélez".
function normalizar(texto) {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function buscarCalles(calles, texto) {
  const buscado = normalizar(texto.trim())
  if (!buscado) return calles
  return calles.filter((resumen) => normalizar(resumen.lugar.nombre).includes(buscado))
}

// Segunda línea de una calle con trabajos: "OT #12 · Bacheo · Urgente · 2 trabajos abiertos"
export function textoDeLaCalle(resumen) {
  const orden = resumen.principal
  if (!orden) return resumen.lugar.estadoOperativo === false ? 'Fuera de servicio · Sin trabajos abiertos' : 'Sin trabajos abiertos'
  const partes = [`OT #${orden.id}`, etiqueta(TIPOS_TRABAJO, orden.tipo), etiqueta(PRIORIDADES, orden.prioridad)]
  if (resumen.ordenes.length > 1) partes.push(`${resumen.ordenes.length} trabajos abiertos`)
  return partes.filter(Boolean).join(' · ')
}
