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
  // "A futuro": las que el intendente planificó (con su arquitecto, ingeniero…). Las carga el encargado, no llevan OT
  // y se marcan como instaladas cuando se ponen. La clave 'falta' es la de siempre (instalada === false).
  { clave: 'falta', nombre: 'A futuro', plural: 'A futuro', descripcion: 'Planificada, todavía no se instaló', color: '#4F5D65' },
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

// Solo las luminarias, cada una con su estado y si es nueva o vieja: [{ resumen, estado, antiguedad }]
// (antiguedad: 'nueva' | 'vieja' | 'sinMarcar', o null en las a futuro; ver "Nueva o vieja" más abajo)
export function luminariasConEstado(resumenes) {
  return resumenes
    .filter((resumen) => esLuminaria(resumen.lugar))
    .map((resumen) => ({ resumen, estado: estadoLuminaria(resumen), antiguedad: antiguedadLuminaria(resumen.lugar) }))
}

function contarPorEstado(items) {
  const cuenta = Object.fromEntries(ESTADOS_LUMINARIA.map((estado) => [estado.clave, 0]))
  for (const item of items) cuenta[item.estado] += 1
  return cuenta
}

// Porcentaje de las INSTALADAS que funcionan (las luminarias a futuro no cuentan). null si no hay ninguna instalada.
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

// ---------- Cambiar el estado desde el mapa (ficha de la luminaria) ----------
// Una luminaria instalada se cambia a mano entre Funciona y Apagada. "En arreglo" NO se elige: sale de tener una OT
// abierta (desde la ficha se crea con "Crear OT de arreglo") y, al finalizar esa OT, el backend la deja funcionando.
// Las luminarias a futuro no se eligen acá: se cargan así ("Agregar luminaria a futuro") y se pasan a
// instaladas con "Marcar como instalada" (= pedidoParaEstado(lugar, 'funciona')).
export const ESTADOS_A_MANO = ['funciona', 'apagada']

const DATOS_A_MANO = {
  funciona: { estadoOperativo: true, instalada: true },
  apagada: { estadoOperativo: false, instalada: true },
  falta: { estadoOperativo: false, instalada: false },
}

// Cómo está marcada hoy (sin mirar las OT: "en arreglo" se ve como "apagada"; 'falta' = a futuro)
export function estadoAMano(lugar) {
  if (lugar.instalada === false) return 'falta'
  return lugar.estadoOperativo === false ? 'apagada' : 'funciona'
}

// Lo que se manda al backend (PUT /api/infraestructura/{id}) para dejar la luminaria en ese estado.
// Va el lugar entero (el backend pide todos los datos), con el estado nuevo.
export function pedidoParaEstado(lugar, clave) {
  const cambios = DATOS_A_MANO[clave]
  if (!cambios) throw new Error(`Estado desconocido: ${clave}`)
  const { nombre, tipo, datosTecnicos, ubicacion } = lugar
  return { nombre, tipo, datosTecnicos, ubicacion, ...cambios }
}

// ---------- Mostrar / ocultar estados en el mapa ----------
// ocultos: { apagada: true, ... } = los estados que se destildaron en la leyenda. Los conteos no cambian.
export function filtrarPorEstado(items, ocultos = {}) {
  return items.filter((item) => !ocultos[item.estado])
}

// ---------- Nueva o vieja ("antigüedad") ----------
// Cada luminaria instalada se marca como Nueva (ej. las LED que se están poniendo) o Vieja (las de antes).
// Se elige al agregarla (obligatorio) y se puede cambiar después desde la ficha, en los dos sentidos, con un pop-up
// de confirmación por si se equivocan. En el backend es el campo "nueva": true = Nueva, false = Vieja,
// null = "Sin marcar" (cargada antes de este cambio). Las a futuro no se marcan: al instalarlas quedan Nuevas solas.
export const ANTIGUEDADES = [
// "luz" es el color del cabezal (la lámpara): blanco frío para las nuevas (tipo LED) y naranja de sodio para las viejas.
// El color del estado (la base del poste: verde, rojo, ámbar, gris) no cambia.
  { clave: 'nueva', nombre: 'Nueva', plural: 'Nuevas', descripcion: 'Luminaria nueva (por ejemplo, LED)', luz: '#F4F8FF' },
  { clave: 'vieja', nombre: 'Vieja', plural: 'Viejas', descripcion: 'Luminaria de las de antes', luz: '#F28C28' },
  { clave: 'sinMarcar', nombre: 'Sin marcar', plural: 'Sin marcar', descripcion: 'Todavía no se dijo si es nueva o vieja', luz: null },
]

export function datosDeAntiguedad(clave) {
  return ANTIGUEDADES.find((antiguedad) => antiguedad.clave === clave) ?? null
}

// 'nueva' | 'vieja' | 'sinMarcar'. null si no corresponde (no es luminaria, o es a futuro).
export function antiguedadLuminaria(lugar) {
  if (!esLuminaria(lugar) || lugar.instalada === false) return null
  if (lugar.nueva === true) return 'nueva'
  if (lugar.nueva === false) return 'vieja'
  return 'sinMarcar'
}

// ¿Se tiene que preguntar "¿Es nueva o vieja?" en el formulario? Solo para una luminaria que ya está puesta.
export function preguntaAntiguedad({ tipo, instalada }) {
  return tipo === TIPO_LUMINARIA && instalada !== false
}

// Al agregar una luminaria la respuesta es obligatoria (no viene ninguna elegida, para que no se cargue mal por apuro).
export function faltaAntiguedad(datos) {
  return preguntaAntiguedad(datos) && typeof datos.nueva !== 'boolean'
}

export const FALTA_ANTIGUEDAD = 'Elegí si la luminaria es nueva o vieja.'

// Lo que se suma al pedido del formulario: { nueva } solo si es una luminaria puesta y se eligió algo.
// Si no, no se manda nada (al modificar, el backend deja la marca como estaba).
export function antiguedadParaGuardar(datos) {
  return preguntaAntiguedad(datos) && typeof datos.nueva === 'boolean' ? { nueva: datos.nueva } : {}
}

// Lo que se manda al backend (PUT /api/infraestructura/{id}) para marcarla como nueva (true) o vieja (false).
// Va el lugar entero (el backend pide todos los datos), sin tocar si funciona o no.
export function pedidoParaAntiguedad(lugar, nueva) {
  const { nombre, tipo, datosTecnicos, ubicacion, estadoOperativo } = lugar
  return { nombre, tipo, datosTecnicos, ubicacion, estadoOperativo, instalada: true, nueva }
}

// "la Luminaria San Martín y Belgrano" o, si el nombre no empieza con "Luminaria", "la luminaria “Poste 12”".
export function nombreConArticulo(lugar) {
  return /^luminaria\b/i.test(lugar.nombre ?? '') ? `la ${lugar.nombre}` : `la luminaria “${lugar.nombre}”`
}

// Pregunta del pop-up: "¿Marcar la Luminaria San Martín y Belgrano como vieja?"
export function preguntaCambioAntiguedad(lugar, nueva) {
  return `¿Marcar ${nombreConArticulo(lugar)} como ${nueva ? 'nueva' : 'vieja'}?`
}

// El texto que se muestra si falla un cambio desde la ficha. Si respondió el backend (ej. 400 o 403) se muestra su
// mensaje; si no llegó (sin señal, el navegador dice "Failed to fetch" en inglés) se muestra uno propio en castellano.
export function textoDelError(error, porDefecto = 'No se pudo guardar el cambio: revisá la conexión e intentá de nuevo.') {
  return error?.estado && error.message ? error.message : porDefecto
}

// ---------- Mostrar / ocultar nuevas y viejas en el mapa ----------
// Segundo grupo de casillas de "Mostrar en el mapa". Se combina con el de los estados (filtrarPorEstado).
// Las luminarias a futuro no son ni nuevas ni viejas: este filtro nunca las saca (las saca la casilla "A futuro").

// Cuántas instaladas hay de cada una: { nueva, vieja, sinMarcar }
export function contarPorAntiguedad(items) {
  const cuenta = { nueva: 0, vieja: 0, sinMarcar: 0 }
  for (const item of items) if (item.antiguedad) cuenta[item.antiguedad] += 1
  return cuenta
}

// Las casillas que se muestran: Nuevas y Viejas siempre; "Sin marcar" solo si hay alguna.
export function antiguedadesParaFiltro(cuenta) {
  return ANTIGUEDADES.filter((antiguedad) => antiguedad.clave !== 'sinMarcar' || cuenta.sinMarcar > 0)
}

// ocultos: { vieja: true, ... } = las que se destildaron. Los conteos no cambian.
export function filtrarPorAntiguedad(items, ocultos = {}) {
  return items.filter((item) => !item.antiguedad || !ocultos[item.antiguedad])
}
