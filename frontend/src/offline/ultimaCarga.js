// Lo último que se cargó con señal en "Mis tareas", por persona. Se guarda en el celular para que, si FARO se
// vuelve a abrir (o se recarga) sin señal, las tareas y su sección "Comentarios y fotos" sigan estando.
// Se borra al cerrar sesión (ver limpiarSesion). Si el navegador no deja guardar, queda solo en memoria.
export const PREFIJO_ULTIMA_CARGA = 'faro_ultima_carga_'

const enMemoria = new Map()

export function recordarCarga(idUsuario, datos) {
  enMemoria.set(idUsuario, datos)
  try {
    localStorage.setItem(PREFIJO_ULTIMA_CARGA + idUsuario, JSON.stringify(datos))
  } catch {
    // sin almacenamiento (o lleno): vale mientras FARO siga abierto
  }
}

export function leerCarga(idUsuario) {
  if (enMemoria.has(idUsuario)) return enMemoria.get(idUsuario)
  try {
    const guardada = JSON.parse(localStorage.getItem(PREFIJO_ULTIMA_CARGA + idUsuario) || 'null')
    if (guardada && Array.isArray(guardada.ordenes) && Array.isArray(guardada.estados)) {
      enMemoria.set(idUsuario, guardada)
      return guardada
    }
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
