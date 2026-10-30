import test from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { borrarCopia, guardarCopia, leerCopia } from '../src/offline/almacen.js'
import { crearCopia } from '../src/offline/datosLocal.js'
import { guardarSesion, limpiarSesion } from '../src/utils/sesion.js'

const usuario = { id: 1, rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 2, activo: true }
const token = `cabecera.${Buffer.from(JSON.stringify({ exp: 4000000000 })).toString('base64url')}.firma`

// Doble de IndexedDB: permite comprobar el contrato y los errores; el navegador prueba el almacenamiento real.
function preparar(t) {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  let dato
  const base = { close() {}, transaction() {
    const transaccion = { abort() {}, objectStore() {
      function pedido(resultado) {
        queueMicrotask(() => transaccion.oncomplete())
        return { result: resultado }
      }
      return {
        put: (valor) => { dato = structuredClone(valor); return pedido(valor.id) },
        get: () => pedido(structuredClone(dato)),
        clear: () => { dato = undefined; return pedido(undefined) },
      }
    } }
    return transaccion
  } }
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { open() {
    const pedido = { result: base }
    queueMicrotask(() => pedido.onsuccess())
    return pedido
  } } })
  guardarSesion(token, usuario)
  t.after(() => {
    limpiarSesion()
    if (anterior) Object.defineProperty(globalThis, 'indexedDB', anterior)
    else delete globalThis.indexedDB
  })
  return crearCopia(usuario, { id: 2, nombre: 'Verde' }, [], [])
}

test('se guarda y lee la copia propia; cerrar o eliminar la copia no devuelve datos anteriores', async (t) => {
  const copia = preparar(t)
  await guardarCopia(copia, token)
  assert.deepEqual(await leerCopia(usuario), copia)
  assert.equal(await leerCopia({ ...usuario, id: 9 }), null)
  await borrarCopia()
  assert.equal(await leerCopia(usuario), null)
})

test('una respuesta tardía no guarda tareas luego del cierre de sesión', async (t) => {
  const copia = preparar(t)
  const pendiente = guardarCopia(copia, token)
  limpiarSesion()
  await assert.rejects(pendiente, /sesión cambió/)
  assert.equal(await leerCopia(usuario), null)
})

test('aunque el token sea vigente se rechaza una copia ajena', async (t) => {
  const copia = preparar(t)
  await assert.rejects(guardarCopia({ ...copia, usuarioId: 9 }, token), /no corresponde/)
  assert.equal(await leerCopia(usuario), null)
})

test('si el navegador bloquea IndexedDB se informa el error sin simular un guardado', async (t) => {
  const copia = preparar(t)
  t.mock.method(indexedDB, 'open', () => { throw new Error('Almacenamiento bloqueado') })
  await assert.rejects(guardarCopia(copia, token), /Almacenamiento bloqueado/)
})
