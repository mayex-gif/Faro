// Reglas del pop-up de "Finalizar" y del de "Cancelar" una OT (sin React), para poder probarlas con "npm test".
// El pop-up de Finalizar junta, todo opcional: la casilla "El lugar quedó funcionando", el gasto adicional,
// un comentario y fotos de evidencia. Al terminar se mandan DOS pedidos, en este orden:
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
  return `$ ${numero.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`
}

// Lo que se ve arriba del campo del gasto: el presupuesto que se cargó al crear la OT
export function textoMontoDeclarado(montoAproximado) {
  if (montoAproximado == null || montoAproximado === '' || !Number.isFinite(Number(montoAproximado))) {
    return 'No se declaró un monto'
  }
  return `Monto aproximado declarado: ${formatearPesos(montoAproximado)}`
}

// Revisa el gasto adicional que escribió la persona. Vacío = no hubo otro gasto.
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
 * datos = { casilla (lo de casillaDelLugar), lugarFunciona (si la casilla quedó marcada), gasto (texto),
 *           comentario (texto), fotos (ya achicadas) }
 * Devuelve { errores, comentario, cambio }:
 * - errores: { gasto?, comentario? } (vacío si está todo bien; si hay alguno, no se manda nada)
 * - comentario: { texto, fotos } o null
 * - cambio: { estadoId, lugarFunciona?, gastoAdicional? } (lo que no se completó no viaja: el backend hace lo de siempre)
 */
export function armarFinalizacion(estadoNuevo, { casilla, lugarFunciona = false, gasto = '', comentario = '', fotos = [] } = {}) {
  const errores = {}
  const gastoRevisado = validarGasto(gasto)
  if (gastoRevisado.error) errores.gasto = gastoRevisado.error
  const evidencia = comentarioDeEvidencia(comentario, fotos)
  if (evidencia.error) errores.comentario = evidencia.error

  const cambio = { estadoId: estadoNuevo.id }
  if (casilla?.mostrar) cambio.lugarFunciona = Boolean(lugarFunciona)
  if (gastoRevisado.valor != null) cambio.gastoAdicional = gastoRevisado.valor
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
export function mensajeDeErrorCierre(error) {
  const motivo = mensajeDeError(error)
  if (error?.etapa === 'comentario') return `No se pudo guardar el comentario: ${motivo} La OT sigue abierta.`
  if (error?.etapa === 'estado' && error?.conComentario) return `El comentario se guardó, pero no se pudo finalizar la OT: ${motivo}`
  return `No se pudo finalizar la OT: ${motivo}`
}
