// El servidor de desarrollo (npm run dev) NO registra el service worker, a propósito: el worker se arma recién en el
// build (scripts/generar-sw.js escribe dist/sw.js) y, si guardara los módulos de Vite, la recarga automática dejaría de
// funcionar. Por eso, con "npm run dev" y la red cortada, Chrome muestra el dinosaurio: es lo esperado.
// Para probar FARO sin conexión se usa la versión compilada: "npm run pwa" (ver frontend/PWA_CONSULTA_LOCAL.md).
export const EVENTO_VERSION_NUEVA = 'faro:version-nueva'
export const PREFIJO_CACHE_FARO = 'faro-app-'

let pidioActualizar = false

export function registrarAplicacion() {
  if (!import.meta.env?.PROD) {
    limpiarServiceWorkerEnDesarrollo()
    return
  }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return
  navigator.serviceWorker.register('/sw.js')
    .then((registro) => vigilarVersiones(registro))
    .catch((error) => {
      console.warn('No se pudo preparar FARO para abrir sin conexión.', error)
    })
}

/**
 * En desarrollo, un service worker que quedó de una prueba anterior (por ejemplo, de abrir el build en este mismo
 * puerto) respondería con archivos viejos y taparía los cambios de Vite. Se lo da de baja junto con su caché,
 * y se deja un aviso en la consola de cómo probar la versión sin conexión. Nunca falla: es solo una comodidad.
 */
export async function limpiarServiceWorkerEnDesarrollo({
  trabajador = globalThis.navigator?.serviceWorker, almacenes = globalThis.caches, consola = console,
} = {}) {
  try {
    const registros = trabajador?.getRegistrations ? await trabajador.getRegistrations() : []
    const bajas = await Promise.all(registros.map((registro) => registro.unregister()))
    const nombres = almacenes?.keys ? await almacenes.keys() : []
    const propios = nombres.filter((nombre) => nombre.startsWith(PREFIJO_CACHE_FARO))
    await Promise.all(propios.map((nombre) => almacenes.delete(nombre)))
    if (bajas.some(Boolean) || propios.length > 0) {
      consola.info('FARO (desarrollo): se quitó un service worker viejo de este puerto. Recargá la página.')
    }
  } catch {
    // sin permisos o sin soporte: no hay nada para limpiar
  }
  consola.info('FARO (desarrollo): sin service worker, así que sin red verías el dinosaurio. '
    + 'Para probar el modo sin conexión: npm run pwa (http://localhost:4173).')
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
