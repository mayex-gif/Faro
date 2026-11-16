// Reglas del pop-up de "Finalizar" y del de "Cancelar" una OT (sin React), para poder probarlas con "npm test".
// El pop-up de Finalizar junta, todo opcional: la casilla "El lugar quedó funcionando", "¿Cuánto se gastó en total?"
// (viene cargado con el monto declarado al crear la OT), un comentario y fotos de evidencia. Al terminar se mandan DOS pedidos, en este orden:
//   1. el comentario con las fotos (si escribió algo o sumó fotos) → como cualquier comentario de la OT
//   2. el cambio de estado, con la casilla y el gasto → PATCH /api/ordenes-trabajo/{id}/estado
// Las reglas de los datos son las mismas que controla el backend (CambioEstadoRequestDTO): acá se avisa ANTES de mandar.
import { MAX_FOTOS, MAX_TEXTO, mensajeDeError } from './comentarios.js'

export const FINALIZAR = 'FINALIZAR'
export const CANCELAR = 'CANCELAR'

// El gasto admite hasta 12 enteros y 2 decimales (igual que el monto aproximado de la OT)
const FORMATO_GASTO = /^\d{1,12}([.,]\d{1,2})?$/

export const PREFIJO_MOTIVO = 'Motivo de la cancelación: '
export const MAX_MOTIVO = MAX_TEXTO - PREFIJO_MOTIVO.length

// Los estados son configurables: "Cancelada" se reconoce por el nombre (igual que en el backend y los reportes)
export function esCancelacion(estado) {
  return Boolean(estado?.cierre) && (estado.nombre ?? '').trim().toLowerCase().startsWith('cancel')
}

// "Realizada": un estado de cierre que no es una cancelación (Finalizada)
export function esFinalizacion(estado) {
  return Boolean(estado?.cierre) && !esCancelacion(estado)
}

// Qué pop-up abre el botón: FINALIZAR, CANCELAR o ninguno (null: los demás estados no piden nada)
export function popUpDelCambio(estado) {
  if (esFinalizacion(estado)) return FINALIZAR
  if (esCancelacion(estado)) return CANCELAR
  return null
}

// Cuántos OTROS trabajos abiertos tiene el lugar de esta OT (con la lista de OT que ya tiene la pantalla)
export function otrasAbiertasDelLugar(orden, ordenes = [], estados = []) {
  if (!orden) return 0
  const cierre = new Set(estados.filter((estado) => estado.cierre).map((estado) => estado.id))
  return ordenes.filter((otra) => otra.id !== orden.id
    && String(otra.lugarId) === String(orden.lugarId)
    && !cierre.has(otra.estadoId)).length
}

// "Este lugar tiene 1 trabajo abierto más" / "Este lugar tiene 3 trabajos abiertos más"
export function avisoOtrasAbiertas(cantidad) {
  if (!cantidad) return ''
  return cantidad === 1
    ? 'Este lugar tiene 1 trabajo abierto más'
    : `Este lugar tiene ${cantidad} trabajos abiertos más`
}

/**
 * La casilla "El lugar quedó funcionando":
 * - Solo se muestra si el lugar está "Fuera de servicio" (si ya funciona, no hay nada que preguntar).
 *   Una luminaria "a futuro" (todavía no se puso) nunca se muestra: el backend no la toca.
 * - Viene marcada, salvo que el lugar tenga OTROS trabajos abiertos: ahí viene desmarcada y con el aviso.
 * Si no se sabe cómo está el lugar (lugar = null), no se muestra.
 */
export function casillaDelLugar(lugar, otrasAbiertas = 0) {
  const mostrar = lugar?.estadoOperativo === false && lugar.instalada !== false
  return {
    mostrar,
    marcada: mostrar && otrasAbiertas === 0,
    aviso: mostrar ? avisoOtrasAbiertas(otrasAbiertas) : '',
  }
}

// Pesos argentinos: "$ 12.000" o "$ 8.000,50" (sin decimales si es un número entero)
export function formatearPesos(valor) {
  const numero = Number(valor)
  const decimales = Number.isInteger(numero) ? 0 : 2
  // \u00A0: espacio que no se corta, así "$" y el número no quedan en renglones distintos en el celular
  return `$\u00A0${numero.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`
}

// Lo que se ve arriba del campo del gasto: el presupuesto que se cargó al crear la OT
export function textoMontoDeclarado(montoAproximado) {
  if (montoAproximado == null || montoAproximado === '' || !Number.isFinite(Number(montoAproximado))) {
    return 'No se declaró un monto'
  }
  return `Monto aproximado declarado: ${formatearPesos(montoAproximado)}`
}

// Con qué viene cargado "¿Cuánto se gastó en total?": el monto aproximado que se declaró al crear la OT,
// escrito como lo escribiría la persona ("20000" o "20000,50"). Sin monto declarado, viene vacío.
export function gastoInicial(montoAproximado) {
  if (montoAproximado == null || montoAproximado === '') return ''
  const numero = Number(montoAproximado)
  if (!Number.isFinite(numero) || numero < 0) return ''
  return Number.isInteger(numero) ? String(numero) : numero.toFixed(2).replace('.', ',')
}

// Cuánto se gastó de más (positivo) o de menos (negativo) respecto de lo declarado. null si falta alguno de los dos.
// Se redondea a centavos para que 0,1 + 0,2 no dé 0,30000000000000004.
export function diferenciaDeGasto(gastado, declarado) {
  if (gastado == null || gastado === '' || declarado == null || declarado === '') return null
  const g = Number(gastado)
  const d = Number(declarado)
  if (!Number.isFinite(g) || !Number.isFinite(d)) return null
  return Math.round((g - d) * 100) / 100
}

// Lo que se ve debajo del campo mientras se escribe: "Se gastó $ 5.000 menos de lo declarado",
// "Se gastó $ 3.000 más de lo declarado" o "Lo mismo que se declaró".
// Vacío si no se declaró un monto, si el campo está vacío o si lo escrito todavía no es un número válido.
export function textoDiferencia(textoGasto, montoAproximado) {
  const { valor, error } = validarGasto(textoGasto)
  if (error || valor == null) return ''
  const diferencia = diferenciaDeGasto(valor, montoAproximado)
  if (diferencia == null) return ''
  if (diferencia === 0) return 'Lo mismo que se declaró'
  const cuanto = formatearPesos(Math.abs(diferencia))
  return diferencia < 0 ? `Se gastó ${cuanto} menos de lo declarado` : `Se gastó ${cuanto} más de lo declarado`
}

// La diferencia con signo, para la tabla de Trabajos: "−$ 5.000", "+$ 3.000" o "$ 0"
// (el signo menos es el de verdad, "−", que se lee mejor que el guion)
export function formatearDiferencia(diferencia) {
  if (diferencia == null || !Number.isFinite(Number(diferencia))) return ''
  const numero = Number(diferencia)
  if (numero === 0) return formatearPesos(0)
  return `${numero < 0 ? '\u2212' : '+'}${formatearPesos(Math.abs(numero))}`
}

// Lo que se ve en la tabla de Trabajos debajo del estado de una OT finalizada:
// "Gastado $ 15.000 (−$ 5.000)"; sin monto declarado, "Gastado $ 15.000"; igual a lo declarado, "Gastado $ 20.000 (lo declarado)".
// Vacío si no se informó cuánto se gastó.
export function textoGastoDeLaOrden(orden) {
  if (orden?.gastoReal == null) return ''
  const gastado = `Gastado ${formatearPesos(orden.gastoReal)}`
  const diferencia = diferenciaDeGasto(orden.gastoReal, orden.montoAproximado)
  if (diferencia == null) return gastado
  if (diferencia === 0) return `${gastado} (lo declarado)`
  return `${gastado} (${formatearDiferencia(diferencia)})`
}

// Revisa "¿Cuánto se gastó en total?" como lo escribió la persona. Vacío = no se informó.
// Devuelve { valor, error }: valor es el número a mandar (o null) y error el mensaje (o null).
export function validarGasto(texto) {
  const limpio = String(texto ?? '').trim()
  if (!limpio) return { valor: null, error: null }
  if (limpio.startsWith('-')) return { valor: null, error: 'El gasto no puede ser negativo.' }
  // "8.000" en Argentina es ocho mil, no ocho: mejor pedir el número sin puntos que adivinar
  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    return { valor: null, error: 'Escribí solo el número, sin puntos de miles (ej: 8000 o 8000,50).' }
  }
  if (!FORMATO_GASTO.test(limpio)) {
    const numero = /^(\d+)([.,]\d+)?$/.exec(limpio)
    let error = 'Escribí solo el número, sin puntos de miles (ej: 8000 o 8000,50).'
    if (numero && numero[1].length > 12) error = 'El monto es demasiado grande.'
    else if (numero) error = 'Escribí el monto con hasta 2 decimales (ej: 8000 o 8000,50).'
    return { valor: null, error }
  }
  return { valor: Number(limpio.replace(',', '.')), error: null }
}

// El comentario de evidencia: null si no escribió nada ni sumó fotos (no se manda nada)
function comentarioDeEvidencia(comentario = '', fotos = []) {
  const texto = comentario.trim()
  if (!texto && fotos.length === 0) return { comentario: null, error: null }
  if (texto.length > MAX_TEXTO) return { comentario: null, error: `El comentario puede tener hasta ${MAX_TEXTO} caracteres.` }
  if (fotos.length > MAX_FOTOS) return { comentario: null, error: `Se pueden agregar hasta ${MAX_FOTOS} fotos.` }
  return { comentario: { texto, fotos: [...fotos] }, error: null }
}

/**
 * Arma lo que se manda al tocar "Finalizar" en el pop-up. Nada es obligatorio.
 * datos = { casilla (lo de casillaDelLugar), lugarFunciona (si la casilla quedó marcada), gasto (texto: el total),
 *           comentario (texto), fotos (ya achicadas) }
 * Devuelve { errores, comentario, cambio }:
 * - errores: { gasto?, comentario? } (vacío si está todo bien; si hay alguno, no se manda nada)
 * - comentario: { texto, fotos } o null
 * - cambio: { estadoId, lugarFunciona?, gastoReal? } (lo que no se completó no viaja: el backend hace lo de siempre)
 */
export function armarFinalizacion(estadoNuevo, { casilla, lugarFunciona = false, gasto = '', comentario = '', fotos = [] } = {}) {
  const errores = {}
  const gastoRevisado = validarGasto(gasto)
  if (gastoRevisado.error) errores.gasto = gastoRevisado.error
  const evidencia = comentarioDeEvidencia(comentario, fotos)
  if (evidencia.error) errores.comentario = evidencia.error

  const cambio = { estadoId: estadoNuevo.id }
  if (casilla?.mostrar) cambio.lugarFunciona = Boolean(lugarFunciona)
  if (gastoRevisado.valor != null) cambio.gastoReal = gastoRevisado.valor
  return { errores, comentario: evidencia.comentario, cambio }
}

/**
 * Arma lo que se manda al tocar "Cancelar la OT" en el pop-up chico. El motivo es opcional:
 * si se escribió, va como comentario "Motivo de la cancelación: …". Sin casilla, sin gasto, sin fotos.
 */
export function armarCancelacion(estadoNuevo, motivo = '') {
  const texto = motivo.trim()
  const errores = {}
  if (texto.length > MAX_MOTIVO) errores.motivo = `El motivo puede tener hasta ${MAX_MOTIVO} caracteres.`
  return {
    errores,
    comentario: texto && !errores.motivo ? { texto: `${PREFIJO_MOTIVO}${texto}`, fotos: [] } : null,
    cambio: { estadoId: estadoNuevo.id },
  }
}

// ¿Hay algún error? (para habilitar el botón y no mandar nada)
export function hayErrores(errores) {
  return Object.keys(errores ?? {}).length > 0
}

// ===================== Después de finalizar =====================

// Lo que se avisa arriba de la lista. Ej: 'La OT #12 pasó a "Finalizada". Se guardó el comentario con 2 fotos.'
export function mensajeDeCierre(orden, comentario) {
  const base = `La OT #${orden.id} pasó a "${orden.estadoNombre}".`
  if (!comentario) return base
  if (comentario.texto?.startsWith(PREFIJO_MOTIVO)) return `${base} Se guardó el motivo.`
  const fotos = comentario.fotos?.length ?? 0
  if (fotos === 0) return `${base} Se guardó el comentario.`
  const conFotos = fotos === 1 ? '1 foto' : `${fotos} fotos`
  return comentario.texto ? `${base} Se guardó el comentario con ${conFotos}.` : `${base} Se guardaron ${conFotos}.`
}

// De cada lugar alcanza con saber cómo está (para la casilla): así se puede guardar en el celular sin ocupar lugar
export function resumenLugares(lugares = []) {
  return lugares.map(({ id, tipo, estadoOperativo, instalada }) => ({ id, tipo, estadoOperativo, instalada }))
}

// La lista de lugares como queda después de finalizar (igual que hace el backend):
// con la casilla marcada el lugar vuelve a "Funciona"; sin la casilla, una luminaria vuelve sola (lo de siempre).
export function lugaresDespuesDelCierre(lugares = [], lugarId, cambio = {}) {
  return lugares.map((lugar) => {
    if (String(lugar.id) !== String(lugarId) || lugar.instalada === false) return lugar
    const vuelve = 'lugarFunciona' in cambio ? cambio.lugarFunciona === true : lugar.tipo === 'LUMINARIA'
    return vuelve ? { ...lugar, estadoOperativo: true } : lugar
  })
}

// Qué se le dice a la persona si el envío falló (error.etapa la pone api/cierreOrden.js).
// - Falló el comentario: la OT sigue abierta y lo escrito sigue en el pop-up, para corregir y reintentar.
// - El comentario llegó pero falló el cambio de estado: se avisa que el comentario ya está (al reintentar no se repite).
// cancelar = true en el pop-up de Cancelar (ahí el comentario es "el motivo").
export function mensajeDeErrorCierre(error, { cancelar = false } = {}) {
  const motivo = mensajeDeError(error)
  const accion = cancelar ? 'cancelar' : 'finalizar'
  const texto = cancelar ? 'el motivo' : 'el comentario'
  if (error?.etapa === 'comentario') return `No se pudo guardar ${texto}: ${motivo} La OT sigue abierta.`
  if (error?.etapa === 'estado' && error?.conComentario) {
    return `${texto[0].toUpperCase()}${texto.slice(1)} se guardó, pero no se pudo ${accion} la OT: ${motivo}`
  }
  return `No se pudo ${accion} la OT: ${motivo}`
}

// Lo que se ve en el cartel del cuaderno debajo de "OT #4: pasar a Finalizada", para saber qué se va a mandar.
// Ej: "El lugar queda funcionando · Gasto total $ 15.000". Vacío si no hay nada de eso.
// Las comandas que quedaron en el cuaderno con el pop-up viejo traen "gastoAdicional": se muestran como antes.
export function detalleDeCierre(operacion) {
  const partes = []
  if (operacion?.lugarFunciona === true) partes.push('El lugar queda funcionando')
  if (operacion?.lugarFunciona === false) partes.push('El lugar sigue fuera de servicio')
  if (typeof operacion?.gastoReal === 'number') partes.push(`Gasto total ${formatearPesos(operacion.gastoReal)}`)
  else if (typeof operacion?.gastoAdicional === 'number') partes.push(`Gasto adicional ${formatearPesos(operacion.gastoAdicional)}`)
  return partes.join(' · ')
}
