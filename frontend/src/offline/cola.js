// El cuaderno guardado en el celular (IndexedDB).
// Es una base APARTE de la copia local ("faro-consulta-local"): al cerrar sesión o con un 401 se borra la copia,
// pero el cuaderno NO, para no perder lo hecho sin señal (se manda cuando la misma persona vuelve a entrar).
// Este archivo también va pegado dentro del service worker (scripts/armar-sw.js), para el envío con FARO cerrado:
// por eso no usa nada de React ni de la página (window se usa solo si existe).
import { operacionValida, ordenarCola } from './datosCola.js'

const BASE = 'faro-cola-cambios'
const TABLA = 'operaciones'
// Para el envío con FARO cerrado (Background Sync): con qué cuenta y a qué backend mandar. Se borra al cerrar sesión.
const TABLA_SESION = 'sesion'
// Canal entre pestañas y el service worker: cuando uno cambia el cuaderno, los demás se enteran
const CANAL = 'faro-cola-cambios'

// Se avisa a la pantalla cada vez que el cuaderno cambia (el contador de arriba y los carteles lo escuchan)
export const EVENTO_COLA = 'faro:cola-cambio'

function abrir() {
  return new Promise((resolver, rechazar) => {
    if (typeof indexedDB === 'undefined') {
      rechazar(new Error('Este navegador no permite guardar cambios sin conexión.'))
      return
    }
    // Versión 2 (paso 10): se suma la tabla "sesion". Si la base ya existía, solo se agrega lo que falta.
    const pedido = indexedDB.open(BASE, 2)
    pedido.onupgradeneeded = () => {
      const base = pedido.result
      if (!base.objectStoreNames.contains(TABLA)) base.createObjectStore(TABLA, { keyPath: 'operacionId' })
      if (!base.objectStoreNames.contains(TABLA_SESION)) base.createObjectStore(TABLA_SESION, { keyPath: 'id' })
    }
    pedido.onerror = () => rechazar(pedido.error)
    pedido.onblocked = () => rechazar(new Error('Cerrá las otras pestañas de FARO e intentá nuevamente.'))
    pedido.onsuccess = () => resolver(pedido.result)
  })
}

async function operar(modo, accion, nombreTabla = TABLA) {
  const base = await abrir()
  try {
    return await new Promise((resolver, rechazar) => {
      const transaccion = base.transaction(nombreTabla, modo)
      let pedido
      try { pedido = accion(transaccion.objectStore(nombreTabla)) } catch (error) {
        transaccion.abort()
        rechazar(error)
        return
      }
      transaccion.oncomplete = () => resolver(pedido.result)
      transaccion.onerror = () => rechazar(transaccion.error)
      transaccion.onabort = () => rechazar(transaccion.error || new Error('No se pudo guardar el cambio en el celular.'))
    })
  } finally {
    base.close()
  }
}

function avisar() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(EVENTO_COLA))
  }
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const canal = new BroadcastChannel(CANAL)
      canal.postMessage('cambio')
      canal.close()
    } catch { /* sin canal: cada pestaña se entera al volver a ella */ }
  }
}

// Lo que avisan otras pestañas o el service worker por el canal se convierte en el aviso de siempre de esta página
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    new BroadcastChannel(CANAL).onmessage = () => window.dispatchEvent(new CustomEvent(EVENTO_COLA))
  } catch { /* sin canal */ }
}

// Anota un renglón nuevo o reemplaza uno existente (mismo operacionId)
export async function guardarOperacion(operacion) {
  if (!operacionValida(operacion)) throw new Error('El cambio no se pudo anotar: faltan datos.')
  await operar('readwrite', (tabla) => tabla.put(operacion))
  avisar()
}

export async function quitarOperacion(operacionId) {
  await operar('readwrite', (tabla) => tabla.delete(operacionId))
  avisar()
}

// Los renglones de UNA persona, en el orden en que se escribieron. Nunca se mezclan con los de otra cuenta.
export async function leerCola(usuarioId) {
  if (usuarioId == null) return []
  return (await leerTodaLaCola()).filter((operacion) => String(operacion.usuarioId) === String(usuarioId))
}

// Todos los renglones (para avisar en el ingreso que hay cambios sin enviar de otra persona)
export async function leerTodaLaCola() {
  const todas = await operar('readonly', (tabla) => tabla.getAll())
  return ordenarCola((todas ?? []).filter(operacionValida))
}

// Borra todos los renglones de una persona (solo se ofrece si su cuenta fue dada de baja: ya no se podrían enviar)
export async function quitarDePersona(usuarioId) {
  for (const operacion of await leerCola(usuarioId)) {
    await operar('readwrite', (tabla) => tabla.delete(operacion.operacionId))
  }
  avisar()
}

// ===================== Envío con FARO cerrado (Background Sync, Chrome/Android) =====================

// datos = { usuarioId, token, apiBase }. Lo anota el cartero al arrancar (sincronizar.js).
// El token ya está en el almacenamiento de la página; acá se repite solo para que el service worker pueda usarlo.
export async function recordarSesionParaEnvios(datos) {
  await operar('readwrite', (tabla) => tabla.put({ id: 'actual', ...datos }), TABLA_SESION)
}

export async function leerSesionParaEnvios() {
  return (await operar('readonly', (tabla) => tabla.get('actual'), TABLA_SESION)) ?? null
}

// Al cerrar sesión (o con un 401): el service worker ya no puede mandar nada con esa cuenta
export async function olvidarSesionParaEnvios() {
  await operar('readwrite', (tabla) => tabla.delete('actual'), TABLA_SESION)
}

// Le pide al navegador "despertame cuando vuelva la señal". Solo existe en Chrome/Android: en el resto no hace nada
// (el cartero de la página ya cubre esos casos al abrir FARO, al volver la red y al volver a la pestaña).
export async function pedirEnvioEnSegundoPlano() {
  try {
    const registro = await globalThis.navigator?.serviceWorker?.getRegistration()
    await registro?.sync?.register(CANAL)
  } catch { /* el navegador no lo permite: no pasa nada */ }
}
