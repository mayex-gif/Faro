import test from 'node:test'
import assert from 'node:assert/strict'
import { pedir } from '../src/api/cliente.js'
import { iniciarSesion, obtenerPerfil } from '../src/api/auth.js'
import { guardarSesion, leerToken, limpiarSesion } from '../src/utils/sesion.js'

function preparar(t, estado = 200) {
  guardarSesion('sesion-actual', { id: 1 })
  t.after(limpiarSesion)
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, opciones })
    return new Response(JSON.stringify({ mensaje: 'Respuesta de prueba' }), { status: estado })
  })
  return pedidos
}

test('el cliente adjunta Bearer y conserva las otras cabeceras y el cuerpo del pedido', async (t) => {
  const pedidos = preparar(t)
  await pedir('/ordenes-trabajo', { method: 'POST', body: '{}', headers: { 'X-Prueba': 'si' } })
  assert.equal(pedidos[0].opciones.headers.Authorization, 'Bearer sesion-actual')
  assert.equal(pedidos[0].opciones.headers['Content-Type'], 'application/json')
  assert.equal(pedidos[0].opciones.headers['X-Prueba'], 'si')
  assert.equal(pedidos[0].opciones.body, '{}')
  assert.equal('autenticacion' in pedidos[0].opciones, false)
})

test('login usa /api/auth/login, normaliza el correo y no adjunta la sesión anterior', async (t) => {
  const pedidos = preparar(t)
  await iniciarSesion('  ANA@GENERALPAZ.GOB.AR  ', ' Contraseña con espacios ')
  assert.equal(pedidos[0].url, '/api/auth/login')
  assert.equal(pedidos[0].opciones.method, 'POST')
  assert.equal(pedidos[0].opciones.headers.Authorization, undefined)
  assert.deepEqual(JSON.parse(pedidos[0].opciones.body), { email: 'ana@generalpaz.gob.ar', password: ' Contraseña con espacios ' })
})

test('la recuperación de perfil consulta la API con la sesión guardada', async (t) => {
  const pedidos = preparar(t)
  await obtenerPerfil()
  assert.equal(pedidos[0].url, '/api/auth/perfil')
  assert.equal(pedidos[0].opciones.headers.Authorization, 'Bearer sesion-actual')
})

test('un 401 en una petición autenticada elimina la sesión y conserva el error de la API', async (t) => {
  preparar(t, 401)
  await assert.rejects(pedir('/auth/perfil'), { estado: 401, message: 'Respuesta de prueba' })
  assert.equal(leerToken(), '')
})

test('un 401 del formulario de ingreso no dispara el cierre de una sesión existente', async (t) => {
  preparar(t, 401)
  await assert.rejects(iniciarSesion('ana@generalpaz.gob.ar', 'incorrecta'), { estado: 401 })
  assert.equal(leerToken(), 'sesion-actual')
})

test('un 403 informa falta de permiso sin borrar la sesión', async (t) => {
  preparar(t, 403)
  await assert.rejects(pedir('/cuadrillas'), { estado: 403 })
  assert.equal(leerToken(), 'sesion-actual')
})

test('un 401 tardío de un pedido anterior no cierra la nueva sesión', async (t) => {
  preparar(t)
  let responder
  t.mock.method(globalThis, 'fetch', () => new Promise((resolver) => { responder = resolver }))
  const pedido = pedir('/cuadrillas')
  guardarSesion('sesion-nueva', { id: 2 })
  responder(new Response('{}', { status: 401 }))
  await assert.rejects(pedido, { estado: 401 })
  assert.equal(leerToken(), 'sesion-nueva')
})
