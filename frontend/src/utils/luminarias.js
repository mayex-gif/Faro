// Pestaña "Luminarias" del mapa: en qué estado está cada luminaria, cuántas hay de cada una
// y en qué zona del pueblo falta más luz. Es lo que pidió el intendente.
// Son funciones puras (no tocan la pantalla ni el mapa), así se pueden probar con "npm test".
// Trabajan sobre los "resúmenes" del mapa (utils/mapa.js → agruparPorLugar): { lugar, ordenes abiertas, principal }.
import { cajaDe } from './mapa.js'

export const TIPO_LUMINARIA = 'LUMINARIA'

// Los cuatro estados, en el orden en que se muestran (leyenda, casillas, conteos).
// "color" es el de la base del poste en el mapa: verde, rojo, ámbar y gris (además del color,
// el dibujo cambia: lámpara prendida, apagada con una ✕, con una llave, o poste "fantasma").
export const ESTADOS_LUMINARIA = [
  { clave: 'funciona', nombre: 'Funciona', plural: 'Funcionan', descripcion: 'Anda bien', color: '#2F9E5B' },
  { clave: 'apagada', nombre: 'Apagada', plural: 'Apagadas', descripcion: 'No anda y no tiene una OT abierta', color: '#B3261E' },
  { clave: 'arreglo', nombre: 'En arreglo', plural: 'En arreglo', descripcion: 'No anda y ya tiene una OT abierta', color: '#F2B01E' },
  { clave: 'falta', nombre: 'Falta poner', plural: 'Faltan poner', descripcion: 'Planificada, todavía no se instaló', color: '#4F5D65' },
]

export function datosDelEstado(clave) {
  return ESTADOS_LUMINARIA.find((estado) => estado.clave === clave) ?? null
}

export function esLuminaria(lugar) {
  return lugar?.tipo === TIPO_LUMINARIA
}

// El estado de una luminaria, a partir de su resumen. Se mira en este orden:
// 1. instalada === false → "falta" (los lugares viejos traen true: el backend nunca manda null)
// 2. no funciona y tiene alguna OT abierta → "arreglo"
// 3. no funciona → "apagada"
// 4. el resto → "funciona" (aunque tenga una OT abierta, por ejemplo un mantenimiento)
export function estadoLuminaria(resumen) {
  const { lugar, ordenes = [] } = resumen
  if (lugar.instalada === false) return 'falta'
  if (lugar.estadoOperativo === false) return ordenes.length > 0 ? 'arreglo' : 'apagada'
  return 'funciona'
}

// Solo las luminarias, cada una con su estado: [{ resumen, estado }]
export function luminariasConEstado(resumenes) {
  return resumenes
    .filter((resumen) => esLuminaria(resumen.lugar))
    .map((resumen) => ({ resumen, estado: estadoLuminaria(resumen) }))
}

function contarPorEstado(items) {
  const cuenta = Object.fromEntries(ESTADOS_LUMINARIA.map((estado) => [estado.clave, 0]))
  for (const item of items) cuenta[item.estado] += 1
  return cuenta
}

// Porcentaje de las INSTALADAS que funcionan (las que faltan poner no cuentan). null si no hay ninguna instalada.
function porcentajeQueFunciona(cuenta) {
  const instaladas = cuenta.funciona + cuenta.apagada + cuenta.arreglo
  return instaladas === 0 ? null : Math.round((cuenta.funciona * 100) / instaladas)
}

// Lo que va arriba de todo en la pestaña: { total, cuenta: { funciona, apagada, arreglo, falta }, porcentaje }
export function resumirLuminarias(items) {
  const cuenta = contarPorEstado(items)
  return { total: items.length, cuenta, porcentaje: porcentajeQueFunciona(cuenta) }
}

// Las de un estado, por nombre (para las listas del panel).
export function luminariasDelEstado(items, clave) {
  return items
    .filter((item) => item.estado === clave)
    .sort((a, b) => a.resumen.lugar.nombre.localeCompare(b.resumen.lugar.nombre, 'es'))
}

// ---------- Zonas: "¿Dónde falta luz?" ----------
// El pueblo se parte en 4 cuadrantes con centro en el medio de todas las luminarias cargadas.
// Más adelante se puede cambiar por barrios reales sin tocar la pantalla (misma forma de datos).
const CUADRANTES = [
  { clave: 'noroeste', nombre: 'Noroeste', norte: true, oeste: true },
  { clave: 'noreste', nombre: 'Noreste', norte: true, oeste: false },
  { clave: 'suroeste', nombre: 'Suroeste', norte: false, oeste: true },
  { clave: 'sureste', nombre: 'Sureste', norte: false, oeste: false },
]

// El punto de una luminaria: [longitud, latitud] (GeoJSON). Si no es un punto, el centro de su caja.
export function puntoDe(geometria) {
  if (geometria?.type === 'Point') return geometria.coordinates
  const caja = cajaDe(geometria)
  return caja ? [(caja.oeste + caja.este) / 2, (caja.sur + caja.norte) / 2] : null
}

// [{ clave, nombre, limites: { sur, norte, oeste, este }, instaladas, cuenta, porcentaje }]
// Primero la zona con menos luz (porcentaje más bajo). Se saltean las zonas sin luminarias instaladas.
export function zonasDeLuminarias(items) {
  const conPunto = items
    .map((item) => ({ ...item, punto: puntoDe(item.resumen.lugar.ubicacion) }))
    .filter((item) => item.punto)
  if (conPunto.length === 0) return []
  const lngs = conPunto.map((item) => item.punto[0])
  const lats = conPunto.map((item) => item.punto[1])
  const caja = { oeste: Math.min(...lngs), este: Math.max(...lngs), sur: Math.min(...lats), norte: Math.max(...lats) }
  const centro = { lng: (caja.oeste + caja.este) / 2, lat: (caja.sur + caja.norte) / 2 }

  return CUADRANTES
    .map((cuadrante) => {
      const enZona = conPunto.filter(({ punto: [lng, lat] }) =>
        (lat >= centro.lat) === cuadrante.norte && (lng < centro.lng) === cuadrante.oeste)
      const cuenta = contarPorEstado(enZona)
      return {
        clave: cuadrante.clave,
        nombre: cuadrante.nombre,
        limites: {
          sur: cuadrante.norte ? centro.lat : caja.sur,
          norte: cuadrante.norte ? caja.norte : centro.lat,
          oeste: cuadrante.oeste ? caja.oeste : centro.lng,
          este: cuadrante.oeste ? centro.lng : caja.este,
        },
        instaladas: cuenta.funciona + cuenta.apagada + cuenta.arreglo,
        cuenta,
        porcentaje: porcentajeQueFunciona(cuenta),
      }
    })
    .filter((zona) => zona.instaladas > 0)
    .sort((a, b) => a.porcentaje - b.porcentaje || a.nombre.localeCompare(b.nombre, 'es'))
}

// ¿La luminaria cae en la zona? (para resaltar o filtrar las apagadas de una zona)
export function luminariaEnZona(item, zona) {
  const punto = puntoDe(item.resumen.lugar.ubicacion)
  if (!punto || !zona) return false
  const [lng, lat] = punto
  return lat >= zona.limites.sur && lat <= zona.limites.norte && lng >= zona.limites.oeste && lng <= zona.limites.este
}

// Texto corto de la zona: "2 apagadas · 1 en arreglo"
export function textoDeZona(zona) {
  const { apagada, arreglo } = zona.cuenta
  const partes = [`${apagada} ${apagada === 1 ? 'apagada' : 'apagadas'}`]
  if (arreglo > 0) partes.push(`${arreglo} en arreglo`)
  return partes.join(' · ')
}
