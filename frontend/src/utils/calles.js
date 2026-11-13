// Pestaña Calles del mapa: solo las calles y sus trabajos abiertos.
// Son funciones puras: reciben los resúmenes de utils/mapa.js (agruparPorLugar) y no tocan la pantalla.
import { ordenarResumenes } from './mapa.js'
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta } from './ordenesTrabajo.js'
import { crucesDe, textoTramo, tramoEntre } from './tramos.js'

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

// Segunda línea de una calle con trabajos: "OT #12 · Bacheo · Urgente · entre Catamarca y La Rioja · 2 trabajos abiertos"
// (la ubicación sale de resumen.tramos: ver conTramos)
export function textoDeLaCalle(resumen) {
  const orden = resumen.principal
  if (!orden) return resumen.lugar.estadoOperativo === false ? 'Fuera de servicio · Sin trabajos abiertos' : 'Sin trabajos abiertos'
  const partes = [`OT #${orden.id}`, etiqueta(TIPOS_TRABAJO, orden.tipo), etiqueta(PRIORIDADES, orden.prioridad)]
  const ubicacion = resumen.tramos?.find((tramo) => tramo.orden.id === orden.id)?.texto
  if (ubicacion) partes.push(ubicacion.charAt(0).toLowerCase() + ubicacion.slice(1))
  if (resumen.ordenes.length > 1) partes.push(`${resumen.ordenes.length} trabajos abiertos`)
  return partes.filter(Boolean).join(' · ')
}

// ===================== Tramos de las OT abiertas (la calle es un tren; cada OT, unos vagones) =====================

/**
 * La parte de la calle de una OT (GeoJSON LineString), o null si es de toda la calle.
 * OT viejas con "entre calles" pero sin tramo: se calcula en el momento de esquina a esquina.
 * "Por altura" no tiene tramo (se dibuja toda la calle).
 */
export function tramoDeLaOrden(orden, calle, cruces) {
  if (orden.tramo?.type === 'LineString') return orden.tramo
  if (orden.altura || !orden.calleEntre1 || !orden.calleEntre2) return null
  return tramoEntre(calle, cruces, orden.calleEntre1, orden.calleEntre2)
}

/** Dónde es la OT dentro de la calle: "Entre Catamarca y La Rioja", "Altura 350", "Toda la calle"... */
export function ubicacionDeLaOrden(orden, calle, cruces) {
  if (orden.altura) return `Altura ${orden.altura}`
  const tramo = tramoDeLaOrden(orden, calle, cruces)
  if (!tramo && orden.calleEntre1 && orden.calleEntre2) return `Entre ${orden.calleEntre1} y ${orden.calleEntre2}`
  const texto = textoTramo(calle, cruces, tramo).replace(`${calle.nombre}, `, '')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * A cada calle con trabajos le suma "tramos": uno por OT abierta, en el mismo orden (la más urgente primero).
 * tramos = [{ orden, geometria (LineString, o null = toda la calle), texto }]
 * Las esquinas se calculan con TODAS las calles cargadas. Los lugares que no son calles quedan igual.
 */
export function conTramos(resumenes, calles) {
  return resumenes.map((resumen) => {
    if (!esCalle(resumen.lugar) || resumen.ordenes.length === 0 || resumen.lugar.ubicacion?.type !== 'LineString') return resumen
    const cruces = crucesDe(resumen.lugar, calles)
    const tramos = resumen.ordenes.map((orden) => ({
      orden,
      geometria: tramoDeLaOrden(orden, resumen.lugar, cruces),
      texto: ubicacionDeLaOrden(orden, resumen.lugar, cruces),
    }))
    return { ...resumen, tramos }
  })
}

/**
 * "Todo el pueblo" sin las calles que no tienen trabajos (esas se ven en la pestaña Calles).
 * La calle elegida se queda aunque no tenga trabajos (por ejemplo, si se la buscó arriba).
 */
export function sinCallesVacias(resumenes, lugarActivoId = null) {
  return resumenes.filter((resumen) => !esCalle(resumen.lugar) || resumen.ordenes.length > 0 || resumen.lugar.id === lugarActivoId)
}
