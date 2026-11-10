// Lo último que se cargó con señal en "Mis tareas", por persona. Se guarda en el celular para que, si FARO se
// vuelve a abrir (o se recarga) sin señal, las tareas y su sección "Comentarios y fotos" sigan estando.
// Se borra al cerrar sesión (ver limpiarSesion). Si el navegador no deja guardar, queda solo en memoria.
export const PREFIJO_ULTIMA_CARGA = 'faro_ultima_carga_'
const VERSION = 1
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000
const MAX_CARACTERES = 1_500_000

const enMemoria = new Map()

export function recordarCarga(idUsuario, datos, ahora = Date.now()) {
  enMemoria.set(idUsuario, { datos, guardadaEn: ahora })
  try {
    const serializada = JSON.stringify({ version: VERSION, guardadaEn: ahora, datos })
    if (serializada.length > MAX_CARACTERES) {
      localStorage.removeItem(PREFIJO_ULTIMA_CARGA + idUsuario)
      return
    }
    localStorage.setItem(PREFIJO_ULTIMA_CARGA + idUsuario, serializada)
  } catch {
    // sin almacenamiento (o lleno): vale mientras FARO siga abierto
  }
}

export function leerCarga(idUsuario, ahora = Date.now()) {
  const recordada = enMemoria.get(idUsuario)
  if (recordada) {
    if (ahora - recordada.guardadaEn <= VIGENCIA_MS) return recordada.datos
    enMemoria.delete(idUsuario)
  }
  try {
    const guardada = JSON.parse(localStorage.getItem(PREFIJO_ULTIMA_CARGA + idUsuario) || 'null')
    const datos = guardada?.version === VERSION ? guardada.datos : null
    const edad = ahora - guardada?.guardadaEn
    if (Number.isFinite(guardada?.guardadaEn) && edad >= 0 && edad <= VIGENCIA_MS
      && datos && Array.isArray(datos.ordenes) && Array.isArray(datos.estados)
      && (datos.cuadrillas === undefined || Array.isArray(datos.cuadrillas))) {
      enMemoria.set(idUsuario, { datos, guardadaEn: guardada.guardadaEn })
      return datos
    }
    localStorage.removeItem(PREFIJO_ULTIMA_CARGA + idUsuario)
  } catch {
    // JSON roto o almacenamiento bloqueado: como si no hubiera nada
  }
  return undefined
}

export function olvidarCargas() {
  enMemoria.clear()
  try {
    const claves = []
    for (let i = 0; i < localStorage.length; i++) claves.push(localStorage.key(i))
    claves.filter((clave) => clave?.startsWith(PREFIJO_ULTIMA_CARGA)).forEach((clave) => localStorage.removeItem(clave))
  } catch { /* el navegador puede bloquear el almacenamiento */ }
}
