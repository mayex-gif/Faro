import test from 'node:test'
import assert from 'node:assert/strict'

function conAlmacenamiento(t) {
  const datos = new Map()
  const original = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (datos.has(k) ? datos.get(k) : null),
      setItem: (k, v) => datos.set(k, String(v)),
      removeItem: (k) => datos.delete(k),
      key: (i) => [...datos.keys()][i],
      get length() { return datos.size },
    },
  })
  t.after(() => Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original }))
  return datos
}

test('lo último que se cargó sobrevive a una recarga y se borra al cerrar sesión', async (t) => {
  const datos = conAlmacenamiento(t)
  const { recordarCarga, leerCarga, olvidarCargas } = await import('../src/offline/ultimaCarga.js')
  recordarCarga(7, { ordenes: [{ id: 1 }], estados: [], cuadrillas: [], hora: 'h' })
  assert.ok(datos.has('faro_ultima_carga_7'))
  // "recarga": la memoria se pierde, pero lo guardado se recupera
  const { leerCarga: leer } = await import('../src/offline/ultimaCarga.js?recarga')
  assert.deepEqual(leer(7).ordenes, [{ id: 1 }])
  assert.deepEqual(leerCarga(7).ordenes, [{ id: 1 }])
  olvidarCargas() // cerrar sesión
  assert.equal(datos.size, 0)
  assert.equal(leerCarga(7), undefined)
})

test('un JSON roto o incompleto se ignora', async (t) => {
  const datos = conAlmacenamiento(t)
  const { leerCarga } = await import('../src/offline/ultimaCarga.js')
  datos.set('faro_ultima_carga_8', '{roto')
  datos.set('faro_ultima_carga_9', JSON.stringify({ ordenes: 'x' }))
  assert.equal(leerCarga(8), undefined)
  assert.equal(leerCarga(9), undefined)
})
