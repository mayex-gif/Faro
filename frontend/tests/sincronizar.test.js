import test from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { enviarPendientes, esperaParaReintentar, iniciarSincronizacion } from '../src/offline/sincronizar.js'
import { guardarOperacion, leerCola } from '../src/offline/cola.js'
import { CONFLICTO, PENDIENTE, REINTENTAR, SESION, crearCambioEstado } from '../src/offline/datosCola.js'
import { ErrorApi } from '../src/api/cliente.js'
import { guardarSesion, limpiarSesion } from '../src/utils/sesion.js'

const carlos = { id: 5, nombre: 'Carlos', apellido: 'Rodríguez', rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 1, activo: true }
const juan = { id: 6, nombre: 'Juan', apellido: 'López', rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 2, activo: true }
const vigente = `cabecera.${Buffer.from(JSON.stringify({ exp: 4000000000 })).toString('base64url')}.firma`
const vencido = `cabecera.${Buffer.from(JSON.stringify({ exp: 1000 })).toString('base64url')}.firma`
const enCurso = { id: 3, nombre: 'En curso', color: '#9A4A12' }
const finalizada = { id: 4, nombre: 'Finalizada', color: '#2E7D32' }

function cambio(orden, estado, minuto, numero, usuario = carlos) {
  return crearCambioEstado(usuario, { estadoNombre: 'x', ...orden }, estado,
    { ahora: new Date(Date.UTC(2026, 9, 26, 13, minuto)), numero })
}

// IndexedDB de mentira (una tabla en memoria) + la sesión de Carlos
function preparar(t, { usuario = carlos, token = vigente } = {}) {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const filas = new Map()
  const base = { close() {}, transaction() {
    const transaccion = { abort() {}, objectStore() {
      function pedido(resultado) {
        queueMicrotask(() => transaccion.oncomplete())
        return { result: resultado }
      }
      return {
        put: (valor) => { filas.set(valor.operacionId, structuredClone(valor)); return pedido(valor.operacionId) },
        getAll: () => pedido([...filas.values()].map((fila) => structuredClone(fila))),
        delete: (clave) => { filas.delete(clave); return pedido(undefined) },
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
}

// Un "servidor" de mentira: anota qué le mandaron y responde según la función que le pasemos
function servidor(responder = () => ({})) {
  const recibidas = []
  return { recibidas, enviar: async (operacion) => { recibidas.push(operacion.operacionId); return responder(operacion) } }
}

test('manda todo el cuaderno en orden y lo deja vacío', async (t) => {
  preparar(t)
  await guardarOperacion(cambio({ id: 7, estadoId: 3 }, finalizada, 31, 'b'))
  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a'))
  const { recibidas, enviar } = servidor()

  assert.deepEqual(await enviarPendientes(carlos, { enviar }), { enviadas: 2, conflictos: 0, freno: null })
  assert.deepEqual(recibidas, ['a', 'b'])
  assert.deepEqual(await leerCola(5), [])
})

test('un conflicto queda marcado con el motivo; lo que depende de él espera y lo demás se manda', async (t) => {
  preparar(t)
  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'iniciar-7'))
  await guardarOperacion(cambio({ id: 7, estadoId: 3 }, finalizada, 31, 'finalizar-7'))
  await guardarOperacion(cambio({ id: 8, estadoId: 2 }, enCurso, 32, 'iniciar-8'))
  const { recibidas, enviar } = servidor((operacion) => {
    if (operacion.operacionId === 'iniciar-7') {
      throw new ErrorApi(409, 'Mientras no tenías señal, la OT #7 pasó a Cancelada: tu cambio no se aplicó.',
        { motivo: 'ORDEN_CERRADA', sePuedeAplicar: 'false', estadoActualId: '5', estadoActual: 'Cancelada' })
    }
  })

  assert.deepEqual(await enviarPendientes(carlos, { enviar }), { enviadas: 1, conflictos: 1, freno: null })
  assert.deepEqual(recibidas, ['iniciar-7', 'iniciar-8']) // "finalizar-7" no se mandó: espera la decisión
  const cola = await leerCola(5)
  assert.deepEqual(cola.map((operacion) => [operacion.operacionId, operacion.estado]), [['iniciar-7', CONFLICTO], ['finalizar-7', PENDIENTE]])
  assert.deepEqual(cola[0].conflicto, { mensaje: 'Mientras no tenías señal, la OT #7 pasó a Cancelada: tu cambio no se aplicó.',
    motivo: 'ORDEN_CERRADA', sePuedeAplicar: false, estadoActualId: 5, estadoActual: 'Cancelada' })
})

test('sin señal se frena, no pierde nada y anota el intento', async (t) => {
  preparar(t)
  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a'))
  await guardarOperacion(cambio({ id: 8, estadoId: 2 }, enCurso, 31, 'b'))
  const { recibidas, enviar } = servidor(() => { throw new TypeError('Failed to fetch') })

  assert.deepEqual(await enviarPendientes(carlos, { enviar }), { enviadas: 0, conflictos: 0, freno: REINTENTAR })
  assert.deepEqual(recibidas, ['a']) // no sigue probando con el resto
  const cola = await leerCola(5)
  assert.equal(cola.length, 2)
  assert.equal(cola[0].intentos, 1)
  assert.equal(cola[0].estado, PENDIENTE)
})

test('si el servidor falla (500) también se reintenta más tarde', async (t) => {
  preparar(t)
  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a'))
  const { enviar } = servidor(() => { throw new ErrorApi(503, 'Error 503') })
  assert.equal((await enviarPendientes(carlos, { enviar })).freno, REINTENTAR)
  assert.equal((await leerCola(5)).length, 1)
})

test('con un 401 (sesión vencida o cuenta dada de baja) el cuaderno queda intacto', async (t) => {
  preparar(t)
  const operacion = cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a')
  await guardarOperacion(operacion)
  const { enviar } = servidor(() => { throw new ErrorApi(401, 'Tu sesión venció') })

  assert.deepEqual(await enviarPendientes(carlos, { enviar }), { enviadas: 0, conflictos: 0, freno: SESION })
  assert.deepEqual(await leerCola(5), [operacion]) // ni siquiera se anota el intento
})

test('nunca se manda con la sesión de otra persona ni con un token vencido', async (t) => {
  preparar(t, { usuario: juan })
  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a'))
  const { recibidas, enviar } = servidor()
  assert.equal((await enviarPendientes(carlos, { enviar })).freno, SESION) // la sesión abierta es de Juan
  assert.equal((await enviarPendientes(null, { enviar })).freno, SESION)
  guardarSesion(vencido, carlos)
  assert.equal((await enviarPendientes(carlos, { enviar })).freno, SESION)
  assert.deepEqual(recibidas, [])
  assert.equal((await leerCola(5)).length, 1)
})

test('la espera para reintentar crece y tiene un tope de 5 minutos', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 10].map(esperaParaReintentar), [30000, 60000, 120000, 240000, 300000, 300000, 300000])
  assert.equal(esperaParaReintentar(0), 30000)
})

// ===================== El cartero automático =====================

// window, document y navigator de mentira (en node no existen como en el navegador)
function navegadorFalso(t, { enLinea = true } = {}) {
  const anteriores = ['window', 'document', 'navigator'].map((nombre) => [nombre, Object.getOwnPropertyDescriptor(globalThis, nombre)])
  const ventana = Object.assign(new EventTarget(), { setTimeout, clearTimeout })
  const documento = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const navegador = { onLine: enLinea }
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: ventana })
  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: documento })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: navegador })
  t.after(() => {
    for (const [nombre, descriptor] of anteriores) {
      if (descriptor) Object.defineProperty(globalThis, nombre, descriptor)
      else delete globalThis[nombre]
    }
  })
  return { ventana, documento, navegador }
}

const esperar = (ms = 20) => new Promise((resolver) => setTimeout(resolver, ms))

test('al entrar manda lo que había quedado en el cuaderno', async (t) => {
  preparar(t)
  navegadorFalso(t)
  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a'))
  const { recibidas, enviar } = servidor()

  const apagar = iniciarSincronizacion(carlos, { enviar })
  t.after(apagar)
  await esperar()
  assert.deepEqual(recibidas, ['a'])
  assert.deepEqual(await leerCola(5), [])
})

test('sin red no intenta; cuando vuelve la red ("online") manda solo', async (t) => {
  preparar(t)
  const { ventana, navegador } = navegadorFalso(t, { enLinea: false })
  const { recibidas, enviar } = servidor()
  const apagar = iniciarSincronizacion(carlos, { enviar })
  t.after(apagar)

  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a')) // anotado sin señal
  await esperar()
  assert.deepEqual(recibidas, [])

  navegador.onLine = true
  ventana.dispatchEvent(new Event('online'))
  await esperar()
  assert.deepEqual(recibidas, ['a'])
})

test('con señal, un cambio recién anotado se manda enseguida; también al volver a la pestaña', async (t) => {
  preparar(t)
  const { documento } = navegadorFalso(t)
  let fallar = true
  const { recibidas, enviar } = servidor(() => { if (fallar) throw new TypeError('Failed to fetch') })
  const apagar = iniciarSincronizacion(carlos, { enviar })
  t.after(apagar)

  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a'))
  await esperar()
  assert.deepEqual(recibidas, ['a']) // lo intentó apenas se anotó (y falló: "señal" falsa)

  fallar = false
  documento.dispatchEvent(new Event('visibilitychange'))
  await esperar()
  assert.deepEqual(recibidas, ['a', 'a'])
  assert.deepEqual(await leerCola(5), [])
})

test('apagado (al cerrar sesión) ya no manda nada', async (t) => {
  preparar(t)
  const { ventana } = navegadorFalso(t, { enLinea: false })
  const { recibidas, enviar } = servidor()
  const apagar = iniciarSincronizacion(carlos, { enviar })
  apagar()

  await guardarOperacion(cambio({ id: 7, estadoId: 2 }, enCurso, 30, 'a'))
  ventana.dispatchEvent(new Event('online'))
  await esperar()
  assert.deepEqual(recibidas, [])
  assert.equal(typeof iniciarSincronizacion(null), 'function') // sin usuario no arranca, pero se puede "apagar"
})
