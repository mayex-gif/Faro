import test from 'node:test'
import assert from 'node:assert/strict'
import { API_BASE, ErrorApi, pedir } from '../src/api/cliente.js'

// fetch falso: anota a qué dirección se pidió y contesta lo que le digamos (no sale a internet)
function fetchFalso(t, { status = 200, cuerpo = null } = {}) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, opciones })
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (cuerpo === null) throw new SyntaxError('sin JSON')
        return cuerpo
      },
    }
  })
  return pedidos
}

test('sin VITE_API_URL (compu, Docker y tests) la API queda en /api, la del proxy de Vite', () => {
  assert.equal(API_BASE, '/api')
})

test('pedir arma la dirección con API_BASE + la ruta y devuelve los datos', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: [{ id: 1, nombre: 'Pendiente' }] })

  const datos = await pedir('/estados-orden')

  assert.equal(pedidos.length, 1)
  assert.equal(pedidos[0].url, '/api/estados-orden')
  assert.equal(pedidos[0].opciones.headers['Content-Type'], 'application/json')
  assert.deepEqual(datos, [{ id: 1, nombre: 'Pendiente' }])
})

test('pedir manda el método y el cuerpo que le pasan', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { id: 7 } })

  await pedir('/ordenes-trabajo/7/reasignacion', { method: 'PATCH', body: JSON.stringify({ cuadrillaId: 4 }) })

  assert.equal(pedidos[0].url, '/api/ordenes-trabajo/7/reasignacion')
  assert.equal(pedidos[0].opciones.method, 'PATCH')
  assert.equal(pedidos[0].opciones.body, '{"cuadrillaId":4}')
})

test('si el backend responde con error, pedir lanza ErrorApi con su mensaje y sus errores', async (t) => {
  fetchFalso(t, { status: 409, cuerpo: { estado: 409, mensaje: 'La cuadrilla no está disponible', errores: { cuadrillaId: 'Ocupada' } } })

  await assert.rejects(pedir('/ordenes-trabajo/7/reasignacion'), (error) => {
    assert.ok(error instanceof ErrorApi)
    assert.equal(error.estado, 409)
    assert.equal(error.message, 'La cuadrilla no está disponible')
    assert.deepEqual(error.errores, { cuadrillaId: 'Ocupada' })
    return true
  })
})

test('si el error no trae JSON (por ejemplo, el backend dormido), usa un mensaje genérico', async (t) => {
  fetchFalso(t, { status: 502 })

  await assert.rejects(pedir('/cuadrillas'), (error) => {
    assert.equal(error.estado, 502)
    assert.equal(error.message, 'Error 502')
    assert.deepEqual(error.errores, {})
    return true
  })
})

test('204 (sin contenido, por ejemplo al borrar) devuelve null', async (t) => {
  fetchFalso(t, { status: 204 })

  assert.equal(await pedir('/infraestructura/3', { method: 'DELETE' }), null)
})