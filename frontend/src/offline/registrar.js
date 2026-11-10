// El servidor de desarrollo conserva la recarga de Vite; la copia de la aplicación se prueba con el build.
export const EVENTO_VERSION_NUEVA = 'faro:version-nueva'

let pidioActualizar = false

export function registrarAplicacion() {
  if (!import.meta.env?.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return
  navigator.serviceWorker.register('/sw.js')
    .then((registro) => vigilarVersiones(registro))
    .catch((error) => {
      console.warn('No se pudo preparar FARO para abrir sin conexión.', error)
    })
}

/**
 * Después de un deploy, la versión nueva del service worker queda "esperando" mientras haya pestañas abiertas
 * con la vieja. Acá se avisa a la pantalla (evento faro:version-nueva) para mostrar el cartel "Actualizar".
 * La primera vez que se instala FARO no hay versión vieja (no hay "controller"): no se avisa nada.
 */
export function vigilarVersiones(registro, { ventana = window, documento = document, trabajador = navigator.serviceWorker } = {}) {
  function avisar() {
    ventana.dispatchEvent(new CustomEvent(EVENTO_VERSION_NUEVA))
  }
  if (registro.waiting && trabajador.controller) avisar()
  registro.addEventListener('updatefound', () => {
    const nueva = registro.installing
    nueva?.addEventListener('statechange', () => {
      if (nueva.state === 'installed' && trabajador.controller) avisar()
    })
  })
  // Cuando la versión nueva toma el control porque la persona tocó "Actualizar", se recarga UNA vez
  let recargada = false
  trabajador.addEventListener('controllerchange', () => {
    if (!pidioActualizar || recargada) return
    recargada = true
    ventana.location.reload()
  })
  // Al volver a la pestaña se pregunta si hay un deploy nuevo (las pestañas de FARO suelen quedar abiertas días)
  documento.addEventListener('visibilitychange', () => {
    if (documento.visibilityState === 'visible') registro.update().catch(() => {})
  })
}

// ¿Hay una versión esperando? (para el cartel, al abrir una pantalla)
export async function hayVersionNueva(trabajador = globalThis.navigator?.serviceWorker) {
  if (!trabajador?.getRegistration) return false
  const registro = await trabajador.getRegistration()
  return Boolean(registro?.waiting && trabajador.controller)
}

// El botón "Actualizar" del cartel: la versión que espera pasa a mandar (y la página se recarga sola, una vez)
export async function actualizarAhora(trabajador = globalThis.navigator?.serviceWorker) {
  pidioActualizar = true
  const registro = await trabajador?.getRegistration()
  if (registro?.waiting) registro.waiting.postMessage({ tipo: 'ACTUALIZAR' })
  else globalThis.location?.reload() // por las dudas: si ya no hay nada esperando, alcanza con recargar
}
