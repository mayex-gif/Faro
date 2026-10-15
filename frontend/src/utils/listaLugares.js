// La lista de lugares de la pantalla Mapa: los botoncitos para filtrar y los textos de cada fila.
// Son funciones puras: reciben los resúmenes de utils/mapa.js (agruparPorLugar) y no tocan la pantalla.
import { etiquetaTipoLugar } from './lugares.js'

// Los botoncitos de tipo de lugar. Si no hay ninguno prendido, se ven todos los tipos.
export const FILTROS_TIPO = [
  { valor: 'LUMINARIA', etiqueta: 'Luminarias' },
  { valor: 'ESPACIO_VERDE', etiqueta: 'Espacios verdes' },
  { valor: 'CALLE', etiqueta: 'Calles' },
]

// conTrabajos: el botoncito "Con trabajos abiertos". tipos: los tipos prendidos (vacío = todos).
export const FILTROS_LUGARES_VACIOS = { conTrabajos: false, tipos: [] }

// Prende o apaga un botoncito de tipo (devuelve filtros nuevos, no cambia los que recibe).
export function alternarTipo(filtros, tipo) {
  const tipos = filtros.tipos.includes(tipo)
    ? filtros.tipos.filter((t) => t !== tipo)
    : [...filtros.tipos, tipo]
  return { ...filtros, tipos }
}

// Deja los lugares que pasan los botoncitos. Lo usan la lista y el mapa, así muestran lo mismo.
export function filtrarLugares(resumenes, filtros) {
  return resumenes.filter((resumen) =>
    (!filtros.conTrabajos || resumen.principal !== null)
    && (filtros.tipos.length === 0 || filtros.tipos.includes(resumen.lugar.tipo)))
}

// "1 trabajo abierto" / "3 trabajos abiertos" / "Sin trabajos abiertos"
export function contarTrabajos(cantidad) {
  if (cantidad === 0) return 'Sin trabajos abiertos'
  return cantidad === 1 ? '1 trabajo abierto' : `${cantidad} trabajos abiertos`
}

// Para la ficha del lugar: "2 trabajos abiertos · 1 urgente"
export function textoTrabajos(ordenes) {
  const base = contarTrabajos(ordenes.length)
  const urgentes = ordenes.filter((orden) => orden.prioridad === 'URGENTE').length
  if (urgentes === 0) return base
  return `${base} · ${urgentes === 1 ? '1 urgente' : `${urgentes} urgentes`}`
}

// Segunda línea de cada fila: "Espacio verde · 2 trabajos abiertos", "Luminaria · Fuera de servicio · Sin trabajos abiertos"
export function subtituloLugar(resumen) {
  const partes = [etiquetaTipoLugar(resumen.lugar.tipo)]
  if (!resumen.lugar.estadoOperativo) partes.push('Fuera de servicio')
  partes.push(contarTrabajos(resumen.ordenes.length))
  return partes.join(' · ')
}
