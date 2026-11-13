// Reglas de "Ubicación dentro de la calle" del formulario de OT (components/FormularioOrden.jsx).
// Funciones puras: reciben la calle elegida, todas las calles cargadas y lo que hay en el formulario.
// Modos:
//   NINGUNA       → toda la calle (sin tramo)
//   TRAMO         → el tramo marcado en el mapa (o el que ya tenía la OT); "entre calles" solo ofrece las que lo limitan
//   ENTRE_CALLES  → se eligen dos calles que cruzan; con ellas se arma el tramo (de esquina a esquina)
//   ALTURA        → una altura (texto), sin tramo
import { callesQueLimitan, crucesDe, distanciasDelTramo, tramoEntre } from './tramos.js'

export const MODOS_UBICACION = {
  NINGUNA: 'NINGUNA',
  TRAMO: 'TRAMO',
  ENTRE_CALLES: 'ENTRE_CALLES',
  ALTURA: 'ALTURA',
}

const esCalle = (lugar) => lugar?.tipo === 'CALLE'

// Nombres sin repetir y en el orden en que aparecen
function sinRepetir(nombres) {
  return [...new Set(nombres.filter(Boolean))]
}

/** Las esquinas de la calle con todas las calles cargadas ([] si no es una calle con línea). */
export function crucesDeLaCalle(calle, lugares) {
  if (!esCalle(calle) || calle.ubicacion?.type !== 'LineString') return []
  return crucesDe(calle, (lugares ?? []).filter(esCalle))
}

/**
 * Cómo arranca la ubicación del formulario.
 * - Editando: el tramo guardado manda (TRAMO); si no, altura; si no, entre calles (OT viejas sin tramo); si no, toda la calle.
 * - OT nueva desde el mapa: si trae tramo → TRAMO con sus "entre calles"; si no → toda la calle.
 */
export function ubicacionInicial(orden) {
  const tramo = orden?.tramo ?? null
  const base = { tramo, calleEntre1: orden?.calleEntre1 ?? '', calleEntre2: orden?.calleEntre2 ?? '', altura: orden?.altura ?? '' }
  if (tramo) return { ...base, altura: '', modoUbicacion: MODOS_UBICACION.TRAMO }
  if (base.altura) return { ...base, modoUbicacion: MODOS_UBICACION.ALTURA }
  if (base.calleEntre1) return { ...base, modoUbicacion: MODOS_UBICACION.ENTRE_CALLES }
  return { ...base, modoUbicacion: MODOS_UBICACION.NINGUNA }
}

/**
 * Las calles que se ofrecen en "Entre calles".
 * - TRAMO: solo las que limitan el tramo (las que lo cruzan por dentro + la esquina anterior / siguiente si
 *   empieza o termina en la mitad de una cuadra).
 * - ENTRE_CALLES: solo las que cruzan la calle.
 * Siempre se suman las que ya estaban elegidas (para no perder lo guardado en OT viejas).
 */
export function callesOfrecidas({ calle, cruces, modo, tramo, elegidas = [] }) {
  let nombres = []
  if (modo === MODOS_UBICACION.TRAMO && tramo) {
    const distancias = distanciasDelTramo(calle, tramo)
    if (distancias) nombres = callesQueLimitan(cruces, distancias.desde, distancias.hasta).map((c) => c.calle.nombre)
  } else if (modo === MODOS_UBICACION.ENTRE_CALLES) {
    nombres = (cruces ?? []).map((c) => c.calle.nombre)
  }
  return sinRepetir([...nombres, ...elegidas])
}

/** Errores de la ubicación ({} si está bien). datos = { modoUbicacion, calleEntre1, calleEntre2, altura, tramo } */
export function validarUbicacion(datos, ofrecidas) {
  const errores = {}
  const { modoUbicacion: modo, calleEntre1, calleEntre2 } = datos
  if (modo === MODOS_UBICACION.ENTRE_CALLES) {
    if (ofrecidas.length === 0) {
      errores.modoUbicacion = 'Esta calle no cruza con ninguna calle cargada: usá "Por altura" o "Toda la calle".'
      return errores
    }
    if (!calleEntre1) errores.calleEntre1 = 'Elegí la primera calle.'
    if (!calleEntre2) errores.calleEntre2 = 'Elegí la segunda calle.'
  }
  // Con el tramo marcado, "entre calles" es opcional, pero van las dos o ninguna
  if (modo === MODOS_UBICACION.TRAMO) {
    if (!datos.tramo) errores.modoUbicacion = 'No hay un tramo marcado: elegí otra opción.'
    if (calleEntre1 && !calleEntre2) errores.calleEntre2 = 'Elegí la segunda calle (o dejá las dos vacías).'
    if (!calleEntre1 && calleEntre2) errores.calleEntre1 = 'Elegí la primera calle (o dejá las dos vacías).'
  }
  if ((modo === MODOS_UBICACION.ENTRE_CALLES || modo === MODOS_UBICACION.TRAMO) && calleEntre1 && calleEntre1 === calleEntre2) {
    errores.calleEntre2 = 'Elegí una calle distinta.'
  }
  if (modo === MODOS_UBICACION.ALTURA && !datos.altura.trim()) errores.altura = 'Indicá la altura.'
  return errores
}

/**
 * Lo que va al backend: { calleEntre1, calleEntre2, altura, tramo }.
 * El PUT de la OT reemplaza todo: por eso SIEMPRE se manda el tramo (null = toda la calle).
 * Entre calles a mano arma el tramo de esquina a esquina (null si no se encuentra, por ejemplo en una OT vieja
 * con calles que ya no se cruzan).
 */
export function pedidoDeUbicacion({ calle, cruces, datos }) {
  const vacio = { calleEntre1: null, calleEntre2: null, altura: null, tramo: null }
  if (!esCalle(calle)) return vacio
  const { modoUbicacion: modo } = datos
  const entre = datos.calleEntre1 && datos.calleEntre2
    ? { calleEntre1: datos.calleEntre1, calleEntre2: datos.calleEntre2 }
    : { calleEntre1: null, calleEntre2: null }
  if (modo === MODOS_UBICACION.TRAMO) return { ...vacio, ...entre, tramo: datos.tramo ?? null }
  if (modo === MODOS_UBICACION.ENTRE_CALLES) {
    return { ...vacio, ...entre, tramo: entre.calleEntre1 ? tramoEntre(calle, cruces, entre.calleEntre1, entre.calleEntre2) : null }
  }
  if (modo === MODOS_UBICACION.ALTURA) return { ...vacio, altura: datos.altura.trim() }
  return vacio
}
