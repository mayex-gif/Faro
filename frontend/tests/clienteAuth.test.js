import test from 'node:test'
import assert from 'node:assert/strict'
import { alRecibirSesionVencida, establecerToken, pedir } from '../src/api/cliente.js'

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

test.afterEach(() => {
  // cada prueba deja el cliente como lo encontró, para no afectar a las siguientes
  establecerToken(null)
  alRecibirSesionVencida(null)
})

test('sin sesión, pedir no manda cabecera Authorization', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: [] })

  await pedir('/estados-orden')

  assert.equal(pedidos[0].opciones.headers.Authorization, undefined)
})

test('con sesión, pedir agrega "Authorization: Bearer <token>" a cada pedido', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: [] })
  establecerToken('el-token-jwt')

  await pedir('/cuadrillas')

  assert.equal(pedidos[0].opciones.headers.Authorization, 'Bearer el-token-jwt')
})

test('un header puesto a mano (ej. validarToken) no se pisa con el token guardado', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: {} })
  establecerToken('el-token-de-la-sesion')

  await pedir('/auth/validar', { headers: { Authorization: 'Bearer otro-token' } })

  assert.equal(pedidos[0].opciones.headers.Authorization, 'Bearer otro-token')
})

test('un 401 con sesión activa avisa que la sesión venció', async (t) => {
  fetchFalso(t, { status: 401, cuerpo: { mensaje: 'Token expirado' } })
  establecerToken('un-token-vencido')
  let avisado = false
  alRecibirSesionVencida(() => { avisado = true })

  await assert.rejects(pedir('/cuadrillas'))
  assert.equal(avisado, true)
})

test('un 401 sin sesión (ej. login con contraseña incorrecta) no avisa que la sesión venció', async (t) => {
  fetchFalso(t, { status: 401, cuerpo: { mensaje: 'Correo o contraseña incorrectos' } })
  let avisado = false
  alRecibirSesionVencida(() => { avisado = true })

  await assert.rejects(pedir('/auth/login', { method: 'POST', body: '{}' }))
  assert.equal(avisado, false)
})
