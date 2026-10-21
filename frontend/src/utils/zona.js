// La zona del municipio que muestra el mapa: Estación General Paz y sus alrededores.
// Son datos y funciones puras (se prueban con "npm test").
import { geometriaEnLimites, geometriaValida } from './mapa.js'

// La plaza principal (coordenadas reales del pueblo).
export const CENTRO_PUEBLO = { latitud: -31.13398511, longitud: -64.14037918 }

// Un cuadrado de unos 6 x 6 km con la plaza en el centro (3 km para cada lado): el pueblo y los caminos
// de alrededor. El mapa no deja moverse ni alejarse fuera de esta zona.
// Si el municipio necesita más (o menos), se cambian estos cuatro números.
export const ZONA_PUEBLO = { sur: -31.1609, norte: -31.107, oeste: -64.1719, este: -64.1089 }

// Separa los lugares en los que se pueden mostrar en el mapa y los que no:
// sin ubicación, con una ubicación inválida o fuera de la zona (por ejemplo, coordenadas mal cargadas).
// Una calle o un espacio verde cuenta como "dentro" si toca la zona.
export function separarPorZona(lugares, zona = ZONA_PUEBLO) {
  const dentro = []
  const fuera = []
  for (const lugar of lugares) {
    if (geometriaValida(lugar.ubicacion) && geometriaEnLimites(lugar.ubicacion, zona)) dentro.push(lugar)
    else fuera.push(lugar)
  }
  return { dentro, fuera }
}

// ¿El punto tocado en el mapa está dentro del pueblo? (para agregar un lugar nuevo)
export function puntoEnLaZona(latitud, longitud, zona = ZONA_PUEBLO) {
  return Number.isFinite(latitud) && Number.isFinite(longitud)
    && latitud >= zona.sur && latitud <= zona.norte && longitud >= zona.oeste && longitud <= zona.este
}

// Coordenadas con 6 decimales (unos 10 cm): suficiente para un poste y más fácil de leer.
export function redondearCoordenada(valor) {
  return Math.round(valor * 1e6) / 1e6
}

// Lo que necesita el backend para un lugar marcado en el mapa: GeoJSON guarda [longitud, latitud].
export function ubicacionDelPunto({ latitud, longitud }) {
  return { type: 'Point', coordinates: [redondearCoordenada(longitud), redondearCoordenada(latitud)] }
}
