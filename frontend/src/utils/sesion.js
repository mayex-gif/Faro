// El token y el perfil se guardan juntos. La contraseña nunca se guarda.
export const CLAVE_TOKEN = 'faro_token'
export const CLAVE_USUARIO = 'faro_usuario'
export const EVENTO_SESION_TERMINADA = 'faro:sesion-terminada'
let sesionTemporal = null

export function leerSesion() {
  if (sesionTemporal) return sesionTemporal
  try {
    return {
      token: localStorage.getItem(CLAVE_TOKEN) || '',
      usuario: JSON.parse(localStorage.getItem(CLAVE_USUARIO) || 'null'),
    }
  } catch {
    return { token: '', usuario: null }
  }
}

export function leerToken() {
  return leerSesion().token
}

export function guardarSesion(token, usuario) {
  sesionTemporal = { token, usuario }
  try {
    localStorage.setItem(CLAVE_TOKEN, token)
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión dura mientras siga abierta la página.
    borrarSesionGuardada()
  }
}

function borrarSesionGuardada() {
  try {
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem(CLAVE_USUARIO)
  } catch { /* El navegador puede bloquear el almacenamiento. */ }
}

export function limpiarSesion() {
  sesionTemporal = null
  borrarSesionGuardada()
}

// Al cambiar la sesión en otra pestaña, hay que volver a leer el almacenamiento.
export function olvidarSesionTemporal() {
  sesionTemporal = null
}

// Solo leemos el vencimiento para avisar a tiempo. La firma y los permisos los valida el backend.
export function vencimientoToken(token) {
  try {
    const contenido = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(contenido))
    return Number.isFinite(exp) ? exp * 1000 : 0
  } catch {
    return 0
  }
}

export function tokenVigente(token, ahora = Date.now()) {
  return vencimientoToken(token) > ahora
}

export function terminarSesion(tokenEnviado, motivo = 'Tu sesión venció. Volvé a iniciar sesión.') {
  // Una respuesta tardía de la sesión anterior no debe cerrar una sesión nueva.
  if (!tokenEnviado || tokenEnviado !== leerToken()) return
  limpiarSesion()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_TERMINADA, { detail: motivo }))
  }
}
