// Lógica del mapa: qué lugares tienen trabajos abiertos, de qué color se pintan y cuáles se ven en pantalla.
// Son funciones puras (no tocan la pantalla ni el mapa), así se pueden probar con "npm test".
import { PRIORIDADES } from './ordenesTrabajo.js'

// RNF11: la prioridad se tiene que reconocer en el mapa sin leer texto.
// Los cuatro tonos son bien distintos entre sí; además, cuanto más urgente, más grande es la marca.
export const COLORES_PRIORIDAD = {
  BAJA: '#1B9FB5',
  MEDIA: '#E5B200',
  ALTA: '#EA6A25',
  URGENTE: '#C0262D',
}
export const COLOR_SIN_TRABAJOS = '#9AA9B0'

// Una "orden abierta" es la que todavía no llegó a un estado de cierre (Finalizada, Cancelada...).
// Se pregunta al backend cuáles son de cierre: los estados son configurables.
export function ordenesAbiertas(ordenes, estados) {
  const cierre = new Set(estados.filter((estado) => estado.cierre).map((estado) => estado.id))
  return ordenes.filter((orden) => !cierre.has(orden.estadoId))
}

function pesoPrioridad(prioridad) {
  return PRIORIDADES.findIndex((opcion) => opcion.valor === prioridad)
}

// Primero las más urgentes y, a igual prioridad, las más antiguas.
function porUrgencia(a, b) {
  return pesoPrioridad(b.prioridad) - pesoPrioridad(a.prioridad)
    || (a.fechaCreacion ?? '').localeCompare(b.fechaCreacion ?? '')
    || a.id - b.id
}

// Un resumen por lugar: { lugar, ordenes (las abiertas del lugar, ya ordenadas), principal }
// "principal" es la orden más urgente: define el color con el que se pinta el lugar. Es null si no hay trabajos.
export function agruparPorLugar(lugares, ordenesAbiertasLista) {
  const porLugar = new Map()
  for (const orden of ordenesAbiertasLista) {
    if (!porLugar.has(orden.lugarId)) porLugar.set(orden.lugarId, [])
    porLugar.get(orden.lugarId).push(orden)
  }
  return lugares.map((lugar) => {
    const ordenes = (porLugar.get(lugar.id) ?? []).sort(porUrgencia)
    return { lugar, ordenes, principal: ordenes[0] ?? null }
  })
}

// Los lugares con trabajos primero (más urgentes arriba); el resto, por nombre.
export function ordenarResumenes(resumenes) {
  return [...resumenes].sort((a, b) => {
    if (a.principal && b.principal) return porUrgencia(a.principal, b.principal)
    if (a.principal || b.principal) return a.principal ? -1 : 1
    return a.lugar.nombre.localeCompare(b.lugar.nombre, 'es')
  })
}

// modo "prioridad": color según la prioridad de la orden principal.
// modo "estado": color del estado de la orden principal (lo informa el backend).
export function colorDelResumen(resumen, modo) {
  if (!resumen.principal) return COLOR_SIN_TRABAJOS
  if (modo === 'estado') return resumen.principal.estadoColor ?? COLOR_SIN_TRABAJOS
  return COLORES_PRIORIDAD[resumen.principal.prioridad] ?? COLOR_SIN_TRABAJOS
}

// Tamaño de la marca de un punto: más urgente = más grande (refuerza el color).
export function radioDelResumen(resumen) {
  if (!resumen.principal) return 6
  return [7, 8, 10, 12][pesoPrioridad(resumen.principal.prioridad)] ?? 7
}

// ---- Geometría (GeoJSON: las coordenadas vienen como [longitud, latitud]) ----

function vertices(coordenadas) {
  if (!Array.isArray(coordenadas)) return []
  if (typeof coordenadas[0] === 'number') return [coordenadas]
  return coordenadas.flatMap(vertices)
}

export function geometriaValida(geometria) {
  if (!geometria || !geometria.type) return false
  const lista = vertices(geometria.coordinates)
  return lista.length > 0 && lista.every(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
}

// Rectángulo que contiene a la geometría: { sur, oeste, norte, este }
export function cajaDe(geometria) {
  const lista = vertices(geometria?.coordinates)
  if (lista.length === 0) return null
  const lngs = lista.map(([lng]) => lng)
  const lats = lista.map(([, lat]) => lat)
  return { sur: Math.min(...lats), oeste: Math.min(...lngs), norte: Math.max(...lats), este: Math.max(...lngs) }
}

// Rectángulo que contiene a todos los lugares dados (para encuadrar el mapa). null si no hay ninguno.
export function limitesDe(lugares) {
  const cajas = lugares.map((lugar) => cajaDe(lugar.ubicacion)).filter(Boolean)
  if (cajas.length === 0) return null
  return {
    sur: Math.min(...cajas.map((c) => c.sur)),
    oeste: Math.min(...cajas.map((c) => c.oeste)),
    norte: Math.max(...cajas.map((c) => c.norte)),
    este: Math.max(...cajas.map((c) => c.este)),
  }
}

// ¿Se ve (aunque sea en parte) esta geometría dentro de la zona del mapa? Sirve para "solo lo que veo".
// Una calle o un espacio verde cuenta si su rectángulo toca la zona visible.
export function geometriaEnLimites(geometria, limites) {
  const caja = cajaDe(geometria)
  if (!caja || !limites) return false
  return caja.este >= limites.oeste && caja.oeste <= limites.este
    && caja.norte >= limites.sur && caja.sur <= limites.norte
}
