import test from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import {
  CLAVE_TOKEN, CLAVE_USUARIO, EVENTO_SESION_TERMINADA, guardarSesion, leerSesion,
  leerToken, limpiarSesion, olvidarSesionTemporal, terminarSesion, tokenVigente, vencimientoToken,
} from '../src/utils/sesion.js'

function almacenamiento(t) {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const datos = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor),
    removeItem: (clave) => datos.delete(clave),
  } })
  limpiarSesion()
  t.after(() => {
    limpiarSesion()
    if (anterior) Object.defineProperty(globalThis, 'localStorage', anterior)
    else delete globalThis.localStorage
  })
  return datos
}

function tokenCon(contenido) {
  return `cabecera.${Buffer.from(JSON.stringify(contenido)).toString('base64url')}.firma`
}

test('el vencimiento se lee en milisegundos; al llegar a esa fecha la sesión ya no vale', () => {
  const token = tokenCon({ exp: 2000 })
  assert.equal(vencimientoToken(token), 2000000)
  assert.equal(tokenVigente(token, 1999999), true)
  assert.equal(tokenVigente(token, 2000000), false)
})

test('un token ilegible, sin vencimiento o con vencimiento no numérico no habilita el acceso', () => {
  for (const token of ['', null, 'malformado', 'a.@@.b', tokenCon({}), tokenCon({ exp: '2000' })]) {
    assert.equal(tokenVigente(token, 1000), false)
  }
})

test('la sesión se recupera del almacenamiento sin guardar la contraseña', (t) => {
  const datos = almacenamiento(t)
  const usuario = { id: 2, nombre: 'Ana', rol: 'MESA_ENTRADAS', activo: true }
  guardarSesion('token-prueba', usuario)
  olvidarSesionTemporal()
  assert.deepEqual(leerSesion(), { token: 'token-prueba', usuario })
  assert.deepEqual([...datos.keys()], [CLAVE_TOKEN, CLAVE_USUARIO])
  limpiarSesion()
  assert.deepEqual(leerSesion(), { token: '', usuario: null })
  assert.equal(datos.size, 0)
})

test('un perfil guardado con JSON roto no produce una excepción ni recupera acceso', (t) => {
  const datos = almacenamiento(t)
  datos.set(CLAVE_TOKEN, 'token')
  datos.set(CLAVE_USUARIO, '{roto')
  assert.deepEqual(leerSesion(), { token: '', usuario: null })
})

test('si no se puede persistir, se mantiene la sesión solo en memoria y se limpia al salir', (t) => {
  const datos = almacenamiento(t)
  datos.set(CLAVE_TOKEN, 'anterior')
  t.mock.method(localStorage, 'setItem', () => { throw new Error('Almacenamiento bloqueado') })
  guardarSesion('temporal', { id: 3 })
  assert.equal(leerToken(), 'temporal')
  assert.equal(datos.size, 0)
  limpiarSesion()
  assert.equal(leerToken(), '')
})

test('el cierre por vencimiento informa a la interfaz y una respuesta vieja no cierra la sesión nueva', (t) => {
  almacenamiento(t)
  const anterior = globalThis.window
  const eventos = []
  globalThis.window = { dispatchEvent: (evento) => eventos.push(evento) }
  t.after(() => { if (anterior) globalThis.window = anterior; else delete globalThis.window })
  guardarSesion('nuevo', { id: 4 })
  terminarSesion('viejo')
  terminarSesion('')
  assert.equal(leerToken(), 'nuevo')
  assert.equal(eventos.length, 0)
  terminarSesion('nuevo', 'Tu sesión venció.')
  assert.equal(leerToken(), '')
  assert.equal(eventos[0].type, EVENTO_SESION_TERMINADA)
  assert.equal(eventos[0].detail, 'Tu sesión venció.')
})
