// Tramos de calle: qué parte de una calle se trabaja en una OT.
// Analogía: la calle es un TREN y cada cuadra un VAGÓN; las esquinas son las uniones entre vagones.
// Son funciones puras (sin pantalla ni pedidos): reciben lugares CALLE con ubicacion GeoJSON LineString
// ([longitud, latitud]) y devuelven números, puntos o un tramo GeoJSON listo para mandar al backend.
// Las distancias son en METROS, medidas a lo largo de la calle desde su primer punto.
import { redondearCoordenada } from './zona.js'

// A cuántos metros de otra calle se considera que la cruza (o que termina en ella, esquina en "T").
export const TOLERANCIA_CRUCE_M = 8
// Un toque a menos de esto de una esquina se pega a la esquina.
export const PEGAR_ESQUINA_M = 15
// Diferencia que se considera "el mismo lugar" (redondeos, toques pegados a la esquina).
const IGUAL_M = 2
// Dos cruces con la misma calle más cerca que esto son el mismo cruce (vértices compartidos de OSM).
const MISMO_CRUCE_M = 15

const RADIO_TIERRA_M = 6371000
const GRADO = Math.PI / 180

// ===================== Geometría en metros (plano local del pueblo) =====================

// Pasa [long, lat] a metros {x, y} alrededor de una latitud de referencia (para un pueblo alcanza).
function aMetros([lng, lat], latRef) {
  return { x: lng * GRADO * RADIO_TIERRA_M * Math.cos(latRef * GRADO), y: lat * GRADO * RADIO_TIERRA_M }
}

function aGrados({ x, y }, latRef) {
  const lng = x / (GRADO * RADIO_TIERRA_M * Math.cos(latRef * GRADO))
  const lat = y / (GRADO * RADIO_TIERRA_M)
  return [redondearCoordenada(lng), redondearCoordenada(lat)]
}

function coordenadasDe(lineaOCalle) {
  const geometria = lineaOCalle?.ubicacion ?? lineaOCalle
  if (geometria?.type !== 'LineString' || !Array.isArray(geometria.coordinates)) return []
  return geometria.coordinates.filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
}

// La línea preparada: puntos en metros y distancia acumulada de cada vértice.
function preparar(coordenadas, latRef) {
  const puntos = coordenadas.map((c) => aMetros(c, latRef))
  const acumulado = [0]
  for (let i = 1; i < puntos.length; i++) {
    acumulado.push(acumulado[i - 1] + Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y))
  }
  return { puntos, acumulado, largo: acumulado[acumulado.length - 1] ?? 0 }
}

function latitudDeReferencia(coordenadas) {
  return coordenadas.length ? coordenadas[0][1] : 0
}

// Punto más cercano a p sobre el segmento a–b: { punto, t (0..1), separacion }
function cercanoEnSegmento(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const largo2 = dx * dx + dy * dy
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / largo2))
  const punto = { x: a.x + t * dx, y: a.y + t * dy }
  return { punto, t, separacion: Math.hypot(p.x - punto.x, p.y - punto.y) }
}

// Dónde se cortan los segmentos a–b y c–d (t sobre a–b), o null si no se cortan.
function corteDeSegmentos(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const denominador = r.x * s.y - r.y * s.x
  if (denominador === 0) return null // paralelos
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denominador
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denominador
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return t
}

// ===================== Medir sobre una calle =====================

/** Largo de la calle (o de una línea GeoJSON) en metros. */
export function largoDe(lineaOCalle) {
  const coordenadas = coordenadasDe(lineaOCalle)
  return preparar(coordenadas, latitudDeReferencia(coordenadas)).largo
}

/**
 * Lleva un punto tocado en el mapa ([long, lat]) a la calle.
 * @returns {{ punto: [number, number], distancia: number, separacion: number } | null}
 *   punto = dónde cae sobre la calle; distancia = metros desde el inicio de la calle;
 *   separacion = a cuántos metros de la calle estaba el toque.
 */
export function proyectar(punto, lineaOCalle) {
  const coordenadas = coordenadasDe(lineaOCalle)
  if (coordenadas.length < 2 || !Array.isArray(punto)) return null
  const latRef = latitudDeReferencia(coordenadas)
  const { puntos, acumulado } = preparar(coordenadas, latRef)
  const p = aMetros(punto, latRef)
  let mejor = null
  for (let i = 1; i < puntos.length; i++) {
    const cercano = cercanoEnSegmento(p, puntos[i - 1], puntos[i])
    if (!mejor || cercano.separacion < mejor.separacion) {
      mejor = { ...cercano, distancia: acumulado[i - 1] + cercano.t * (acumulado[i] - acumulado[i - 1]) }
    }
  }
  return { punto: aGrados(mejor.punto, latRef), distancia: mejor.distancia, separacion: mejor.separacion }
}

/** El punto [long, lat] que está a "distancia" metros del inicio de la calle. */
export function puntoEn(lineaOCalle, distancia) {
  const coordenadas = coordenadasDe(lineaOCalle)
  if (coordenadas.length === 0) return null
  const latRef = latitudDeReferencia(coordenadas)
  const { puntos, acumulado, largo } = preparar(coordenadas, latRef)
  const d = Math.max(0, Math.min(largo, distancia))
  for (let i = 1; i < puntos.length; i++) {
    if (d <= acumulado[i]) {
      const tramo = acumulado[i] - acumulado[i - 1]
      const t = tramo === 0 ? 0 : (d - acumulado[i - 1]) / tramo
      const a = puntos[i - 1]
      const b = puntos[i]
      return aGrados({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, latRef)
    }
  }
  return aGrados(puntos[puntos.length - 1], latRef)
}

// ===================== Esquinas (cruces con otras calles) =====================

function normalizarNombre(texto) {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

/**
 * Las esquinas de una calle: dónde la cruzan (o terminan en ella) las otras calles.
 * Se calcula cortando segmentos con tolerancia (las calles dibujadas a mano no comparten coordenadas
 * exactas con las de OpenStreetMap). Una misma calle aparece una vez por cada cruce real.
 * @returns {Array<{ calle: object, punto: [number, number], distancia: number }>} ordenadas a lo largo de la calle
 */
export function crucesDe(calle, calles, tolerancia = TOLERANCIA_CRUCE_M) {
  const coordenadas = coordenadasDe(calle)
  if (coordenadas.length < 2) return []
  const latRef = latitudDeReferencia(coordenadas)
  const { puntos, acumulado } = preparar(coordenadas, latRef)
  const nombrePropio = normalizarNombre(calle?.nombre)
  const cruces = []

  for (const otra of calles ?? []) {
    if (!otra || otra === calle || (calle?.id != null && otra.id === calle.id)) continue
    if (nombrePropio && normalizarNombre(otra.nombre) === nombrePropio) continue // la misma calle cargada dos veces
    const otrosPuntos = coordenadasDe(otra).map((c) => aMetros(c, latRef))
    if (otrosPuntos.length < 2) continue

    const distancias = []
    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1]
      const b = puntos[i]
      const largoSegmento = acumulado[i] - acumulado[i - 1]
      for (let j = 1; j < otrosPuntos.length; j++) {
        const c = otrosPuntos[j - 1]
        const d = otrosPuntos[j]
        const t = corteDeSegmentos(a, b, c, d)
        if (t !== null) {
          distancias.push({ distancia: acumulado[i - 1] + t * largoSegmento, exacto: true })
          continue
        }
        // No se cortan: ¿pasan a menos de la tolerancia? (esquina en "T" o dibujo a mano un poco corto)
        // La distancia mínima entre dos segmentos siempre está en una punta de alguno de los dos.
        for (const punta of [c, d]) {
          const cercano = cercanoEnSegmento(punta, a, b)
          if (cercano.separacion <= tolerancia) distancias.push({ distancia: acumulado[i - 1] + cercano.t * largoSegmento })
        }
        for (const [punta, distanciaPunta] of [[a, acumulado[i - 1]], [b, acumulado[i]]]) {
          if (cercanoEnSegmento(punta, c, d).separacion <= tolerancia) distancias.push({ distancia: distanciaPunta })
        }
      }
    }

    // Juntamos los cruces repetidos con la misma calle (vértices compartidos, segmentos vecinos)
    // (si en el grupo hay un corte exacto, manda ese; los "casi" solo cuentan si no hay corte)
    distancias.sort((x, y) => x.distancia - y.distancia)
    const grupos = []
    for (const candidato of distancias) {
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && candidato.distancia - ultimo[ultimo.length - 1].distancia <= MISMO_CRUCE_M) ultimo.push(candidato)
      else grupos.push([candidato])
    }
    for (const grupo of grupos) {
      const exactos = grupo.filter((candidato) => candidato.exacto)
      const usados = exactos.length ? exactos : grupo
      const distancia = usados.reduce((suma, candidato) => suma + candidato.distancia, 0) / usados.length
      cruces.push({ calle: otra, punto: puntoEn(calle, distancia), distancia })
    }
  }
  return cruces.sort((x, y) => x.distancia - y.distancia)
}

/**
 * Si la distancia cae a menos de "margen" metros de una esquina, la pega a la esquina.
 * @returns {{ distancia: number, esquina: object | null }} esquina = el cruce donde quedó pegada
 */
export function pegarAEsquina(distancia, cruces, margen = PEGAR_ESQUINA_M) {
  let esquina = null
  for (const cruce of cruces ?? []) {
    const diferencia = Math.abs(cruce.distancia - distancia)
    if (diferencia <= margen && (!esquina || diferencia < Math.abs(esquina.distancia - distancia))) esquina = cruce
  }
  return esquina ? { distancia: esquina.distancia, esquina } : { distancia, esquina: null }
}

// ===================== Cortar y describir el tramo =====================

/** El tramo GeoJSON (LineString) de la calle entre dos distancias, en cualquier orden. */
export function cortar(lineaOCalle, desde, hasta) {
  const coordenadas = coordenadasDe(lineaOCalle)
  if (coordenadas.length < 2) return null
  const latRef = latitudDeReferencia(coordenadas)
  const { puntos, acumulado, largo } = preparar(coordenadas, latRef)
  const inicio = Math.max(0, Math.min(largo, Math.min(desde, hasta)))
  const fin = Math.max(0, Math.min(largo, Math.max(desde, hasta)))
  if (fin - inicio < 0.5) return null // menos de medio metro no es un tramo

  const resultado = [puntoEn(lineaOCalle, inicio)]
  for (let i = 1; i < puntos.length - 1; i++) {
    if (acumulado[i] > inicio && acumulado[i] < fin) resultado.push(aGrados(puntos[i], latRef))
  }
  resultado.push(puntoEn(lineaOCalle, fin))
  return { type: 'LineString', coordinates: resultado }
}

/** Dónde empieza y termina un tramo, en metros sobre la calle (desde ≤ hasta). */
export function distanciasDelTramo(calle, tramo) {
  const coordenadas = coordenadasDe(tramo)
  if (coordenadas.length < 2) return null
  const primero = proyectar(coordenadas[0], calle)
  const ultimo = proyectar(coordenadas[coordenadas.length - 1], calle)
  if (!primero || !ultimo) return null
  return { desde: Math.min(primero.distancia, ultimo.distancia), hasta: Math.max(primero.distancia, ultimo.distancia) }
}

// Saca las calles repetidas (una calle que cruza dos veces se ofrece una sola vez)
function sinRepetir(cruces) {
  const vistos = new Set()
  return cruces.filter((cruce) => {
    const nombre = normalizarNombre(cruce.calle.nombre)
    if (vistos.has(nombre)) return false
    vistos.add(nombre)
    return true
  })
}

/**
 * Las calles "lógicas" para "Entre calles" de un tramo: las que lo cruzan por dentro, y si el tramo
 * empieza (o termina) en la mitad de una cuadra, la esquina anterior al inicio (o la siguiente al fin).
 * Ej.: Buenos Aires desde la mitad de la cuadra entre Catamarca y Jujuy hasta La Rioja
 *      → Catamarca, Jujuy, La Rioja (no Santa Fe ni ninguna otra).
 */
export function callesQueLimitan(cruces, desde, hasta) {
  const lista = cruces ?? []
  const inicio = Math.min(desde, hasta)
  const fin = Math.max(desde, hasta)
  const dentro = lista.filter((c) => c.distancia >= inicio - IGUAL_M && c.distancia <= fin + IGUAL_M)
  const empiezaEnEsquina = dentro.some((c) => Math.abs(c.distancia - inicio) <= IGUAL_M)
  const terminaEnEsquina = dentro.some((c) => Math.abs(c.distancia - fin) <= IGUAL_M)
  const anterior = empiezaEnEsquina ? null : [...lista].reverse().find((c) => c.distancia < inicio - IGUAL_M)
  const siguiente = terminaEnEsquina ? null : lista.find((c) => c.distancia > fin + IGUAL_M)
  return sinRepetir([anterior, ...dentro, siguiente].filter(Boolean))
}

/** Las dos calles para los campos "Entre calles" (la primera y la última que limitan el tramo). */
export function entreCallesDe(limites) {
  if (!limites || limites.length < 2) return { calleEntre1: '', calleEntre2: '' }
  return { calleEntre1: limites[0].calle.nombre, calleEntre2: limites[limites.length - 1].calle.nombre }
}

/**
 * El tramo entre las esquinas con dos calles elegidas en el formulario (sin pasar por el mapa).
 * Si alguna cruza dos veces, usa el par de esquinas más cercano. null si no se encuentra el tramo.
 */
export function tramoEntre(calle, cruces, nombre1, nombre2) {
  const buscado1 = normalizarNombre(nombre1)
  const buscado2 = normalizarNombre(nombre2)
  if (!buscado1 || !buscado2 || buscado1 === buscado2) return null
  const unos = (cruces ?? []).filter((c) => normalizarNombre(c.calle.nombre) === buscado1)
  const otros = (cruces ?? []).filter((c) => normalizarNombre(c.calle.nombre) === buscado2)
  let mejor = null
  for (const a of unos) {
    for (const b of otros) {
      const largo = Math.abs(a.distancia - b.distancia)
      if (!mejor || largo < mejor.largo) mejor = { largo, desde: a.distancia, hasta: b.distancia }
    }
  }
  return mejor ? cortar(calle, mejor.desde, mejor.hasta) : null
}

/** true si no hay tramo o si el tramo va de punta a punta de la calle. */
export function esTodaLaCalle(calle, tramo) {
  if (!tramo) return true
  const distancias = distanciasDelTramo(calle, tramo)
  if (!distancias) return true
  return distancias.desde <= IGUAL_M && distancias.hasta >= largoDe(calle) - IGUAL_M
}

// "Catamarca y La Rioja", pero "Salta e Ituzaingó" (antes de "i"/"hi" va "e")
function unir(a, b) {
  return `${a} ${/^h?i(?![aeiouáéíóú])/i.test(b.trim()) ? 'e' : 'y'} ${b}`
}

// Cómo se dice una posición sobre la calle: "La Rioja", "mitad de cuadra (entre Catamarca y Jujuy)"...
function textoDePosicion(cruces, distancia, largo) {
  const esquina = cruces.find((c) => Math.abs(c.distancia - distancia) <= IGUAL_M)
  if (esquina) return { esquina: true, texto: esquina.calle.nombre }
  if (distancia <= IGUAL_M) return { esquina: true, extremo: true, texto: 'el comienzo de la calle' }
  if (distancia >= largo - IGUAL_M) return { esquina: true, extremo: true, texto: 'el final de la calle' }
  const antes = [...cruces].reverse().find((c) => c.distancia < distancia)
  const despues = cruces.find((c) => c.distancia > distancia)
  if (antes && despues) return { esquina: false, texto: `mitad de cuadra (entre ${unir(antes.calle.nombre, despues.calle.nombre)})`, antes, despues }
  if (antes) return { esquina: false, texto: `mitad de cuadra (pasando ${antes.calle.nombre})`, antes }
  if (despues) return { esquina: false, texto: `mitad de cuadra (antes de ${despues.calle.nombre})`, despues }
  return { esquina: false, texto: 'mitad de cuadra' }
}

/** Cómo se dice un punto de la calle: "La Rioja" (esquina) o "mitad de cuadra (entre Catamarca y Jujuy)". */
export function textoDePunto(calle, cruces, distancia) {
  return textoDePosicion(cruces ?? [], distancia, largoDe(calle)).texto
}

/**
 * El texto del tramo para la ficha, la tarjeta y la historia.
 * "Buenos Aires, toda la calle" · "Buenos Aires, entre Catamarca y La Rioja" ·
 * "Buenos Aires, desde mitad de cuadra (entre Catamarca y Jujuy) hasta La Rioja"
 */
export function textoTramo(calle, cruces, tramo) {
  const nombre = calle?.nombre ?? 'Calle'
  if (esTodaLaCalle(calle, tramo)) return `${nombre}, toda la calle`
  const { desde, hasta } = distanciasDelTramo(calle, tramo)
  const largo = largoDe(calle)
  const inicio = textoDePosicion(cruces ?? [], desde, largo)
  const fin = textoDePosicion(cruces ?? [], hasta, largo)
  if (inicio.esquina && fin.esquina && !inicio.extremo && !fin.extremo) return `${nombre}, entre ${unir(inicio.texto, fin.texto)}`
  // Las dos puntas en la misma cuadra: "parte de la cuadra entre X e Y"
  if (!inicio.esquina && !fin.esquina && inicio.antes === fin.antes && inicio.despues === fin.despues) {
    return `${nombre}, parte de la ${inicio.texto.replace('mitad de cuadra (', 'cuadra ').replace(/\)$/, '')}`
  }
  return `${nombre}, desde ${inicio.texto} hasta ${fin.texto}`
}

// ===================== Marcar el tramo tocando el mapa (dos toques) =====================

// Un toque a más de esto de la calle no cuenta (se tocó otra cosa).
export const SEPARACION_MAXIMA_M = 25

/**
 * Qué pasa con un toque sobre el mapa mientras se marca el tramo.
 * toques: [{ distancia, esquina }] (0, 1 o 2). punto: [long, lat] tocado.
 * Primer toque = inicio, segundo = fin; un tercero empieza de nuevo. Cerca de una esquina se pega a ella.
 * @returns {{ toques: Array, aviso: string }} aviso = '' si el toque se aceptó tal cual
 */
export function tocarTramo(calle, cruces, toques, punto) {
  const proyectado = proyectar(punto, calle)
  if (!proyectado || proyectado.separacion > SEPARACION_MAXIMA_M) {
    return { toques, aviso: `Tocá sobre ${calle?.nombre ?? 'la calle'} (la calle resaltada).` }
  }
  const pegado = pegarAEsquina(proyectado.distancia, cruces)
  const toque = { distancia: pegado.distancia, esquina: pegado.esquina?.calle.nombre ?? null }
  if (toques.length >= 2) return { toques: [toque], aviso: 'Empezaste otra vez: ahora tocá dónde termina el trabajo.' }
  if (toques.length === 1 && Math.abs(toques[0].distancia - toque.distancia) < 1) {
    return { toques, aviso: 'El final tiene que estar en otro lugar de la calle.' }
  }
  return { toques: [...toques, toque], aviso: '' }
}

/**
 * Lo que el mapa le pasa al formulario de OT cuando se aprieta "Seguir".
 * Si el tramo va de punta a punta, la OT es de toda la calle (tramo null, sin "entre calles").
 * @returns {{ tramo, calleEntre1, calleEntre2, texto } | null} null si todavía no hay dos toques
 */
export function pedidoDeTramo(calle, cruces, toques) {
  if (!toques || toques.length < 2) return null
  const tramo = cortar(calle, toques[0].distancia, toques[1].distancia)
  if (!tramo || esTodaLaCalle(calle, tramo)) {
    return { tramo: null, calleEntre1: '', calleEntre2: '', texto: textoTramo(calle, cruces, null) }
  }
  const { desde, hasta } = distanciasDelTramo(calle, tramo)
  return { tramo, ...entreCallesDe(callesQueLimitan(cruces, desde, hasta)), texto: textoTramo(calle, cruces, tramo) }
}
