// Reglas del muro "Comentarios y fotos" (sin React), para poder probarlas con "npm test".
// Son las mismas que controla el backend (ComentarioService.java): acá se usan para avisar ANTES de mandar.

export const MAX_TEXTO = 1000
export const MAX_FOTOS = 5

const ENCARGADO = 'ENCARGADO_CORRALON'
const MESA = 'MESA_ENTRADAS'
const CAPATAZ = 'CAPATAZ_CUADRILLA'

// ¿Puede ver y escribir en el muro de esta OT? Encargado y mesa: en todas. Capataz: solo en las de SU cuadrilla.
export function puedeComentar(usuario, orden) {
  if (usuario?.activo !== true || !orden) return false
  if (usuario.rol === ENCARGADO || usuario.rol === MESA) return true
  if (usuario.rol !== CAPATAZ) return false
  return usuario.cuadrillaId != null && orden.cuadrillaId != null
    && Number(usuario.cuadrillaId) === Number(orden.cuadrillaId)
}

// Revisa lo que se va a mandar. Devuelve el mensaje de error, o null si está bien.
export function validarComentario({ texto = '', fotos = [] } = {}) {
  const limpio = texto.trim()
  if (!limpio && fotos.length === 0) return 'Escribí un comentario o agregá al menos una foto'
  if (limpio.length > MAX_TEXTO) return `El comentario puede tener hasta ${MAX_TEXTO} caracteres`
  if (fotos.length > MAX_FOTOS) return `Se pueden agregar hasta ${MAX_FOTOS} fotos`
  return null
}

// Cuántas fotos más se pueden agregar (nunca menos de 0)
export function fotosQueQuedan(cantidadActual) {
  return Math.max(0, MAX_FOTOS - cantidadActual)
}

// Lo que se muestra debajo del cuadro de texto. Ej: "980 / 1000"
export function contadorTexto(texto = '') {
  return `${texto.trim().length} / ${MAX_TEXTO}`
}

// "1 comentario", "3 comentarios", "Sin comentarios"
export function textoCantidad(cantidad) {
  if (!cantidad) return 'Sin comentarios'
  return cantidad === 1 ? '1 comentario' : `${cantidad} comentarios`
}

// Cuándo se escribió, en corto: "recién", "hace 5 min", "hoy 10:15", "ayer 10:15" o "8/11/26 10:15".
// Se usa la hora del celular (hechoEn): si se escribió sin señal, es la hora real, no la de llegada.
export function fechaComentario(fechaIso, ahora = new Date()) {
  if (!fechaIso) return ''
  const fecha = new Date(fechaIso)
  const minutos = Math.floor((ahora - fecha) / 60000)
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' })
  const dia = (d) => d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  if (dia(fecha) === dia(ahora)) return `hoy ${hora}`
  const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000)
  if (dia(fecha) === dia(ayer)) return `ayer ${hora}`
  const corta = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', year: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
  return `${corta} ${hora}`
}

// Mensaje para la persona cuando algo salió mal al mandar o borrar.
// error = ErrorApi (respondió el backend), TypeError (fetch no llegó: sin red) u otro Error (ej: una foto que no abre).
export function mensajeDeError(error) {
  if (!error) return ''
  if (error instanceof TypeError) return 'No hay conexión con el servidor. Probá de nuevo en un rato.'
  if (error.estado === 413) return 'Las fotos pesan demasiado. Probá con menos fotos.'
  return error.message || 'No se pudo completar. Probá de nuevo.'
}

// El muro después de publicar: el comentario nuevo va primero (si ya estaba, por un reintento, no se repite)
export function sumarAlMuro(muro, comentario) {
  return [comentario, ...muro.filter((otro) => otro.id !== comentario.id)]
}

// El muro después de borrar
export function sacarDelMuro(muro, id) {
  return muro.filter((comentario) => comentario.id !== id)
}

// Texto para lectores de pantalla de cada foto. Ej: "Foto 2 de 3 del comentario de Carlos Rodríguez"
export function descripcionFoto(comentario, indice) {
  return `Foto ${indice + 1} de ${comentario.fotos.length} del comentario de ${comentario.autorNombre}`
}
