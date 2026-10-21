import { leerSesion, leerToken, tokenVigente } from '../utils/sesion.js'
import { copiaDelUsuario } from './datosLocal.js'

const BASE = 'faro-consulta-local'
const TABLA = 'copias'

function abrir() {
  return new Promise((resolver, rechazar) => {
    if (typeof indexedDB === 'undefined') {
      rechazar(new Error('Este navegador no permite guardar la copia local.'))
      return
    }
    const pedido = indexedDB.open(BASE, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABLA, { keyPath: 'id' })
    pedido.onerror = () => rechazar(pedido.error)
    pedido.onblocked = () => rechazar(new Error('Cerrá las otras pestañas de FARO e intentá nuevamente.'))
    pedido.onsuccess = () => resolver(pedido.result)
  })
}

async function operar(modo, accion) {
  const base = await abrir()
  try {
    return await new Promise((resolver, rechazar) => {
      const transaccion = base.transaction(TABLA, modo)
      let pedido
      try { pedido = accion(transaccion.objectStore(TABLA)) } catch (error) {
        transaccion.abort()
        rechazar(error)
        return
      }
      transaccion.oncomplete = () => resolver(pedido.result)
      transaccion.onerror = () => rechazar(transaccion.error)
      transaccion.onabort = () => rechazar(transaccion.error || new Error('No se pudo guardar la copia local.'))
    })
  } finally {
    base.close()
  }
}

export async function guardarCopia(copia, token) {
  return operar('readwrite', (tabla) => {
    // Si se cerró o cambió la sesión mientras se abría IndexedDB, no persistimos sus datos.
    if (!token || token !== leerToken() || !tokenVigente(token)) throw new Error('Tu sesión cambió. Volvé a ingresar.')
    if (!copiaDelUsuario(copia, leerSesion().usuario)) throw new Error('La copia no corresponde a tu cuenta o cuadrilla.')
    return tabla.put(copia)
  })
}

export async function leerCopia(usuario) {
  const copia = await operar('readonly', (tabla) => tabla.get('actual'))
  return copiaDelUsuario(copia, usuario) ? copia : null
}

export function borrarCopia() {
  return operar('readwrite', (tabla) => tabla.clear())
}
