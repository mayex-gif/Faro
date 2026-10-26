import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENTO_COLA, guardarOperacion, leerCola, leerTodaLaCola, quitarOperacion } from '../src/offline/cola.js'
import { enviarOperacion } from '../src/api/sincronizacion.js'
import { ErrorApi } from '../src/api/cliente.js'
import { crearAltaOrden, crearCambioEstado, marcarConflicto } from '../src/offline/datosCola.js'

const carlos = { id: 5, nombre: 'Carlos', apellido: 'Rodríguez' }
const juan = { id: 6, nombre: 'Juan', apellido: 'López' }
const ot7 = { id: 7, descripcion: 'Podar el fresno', lugarNombre: 'Plaza', estadoId: 2, estadoNombre: 'Planificada' }
const enCurso = { id: 3, nombre: 'En curso', color: '#9A4A12' }

function cambio(usuario, minuto, numero) {
  return crearCambioEstado(usuario, ot7, enCurso, { ahora: new Date(Date.UTC(2026, 9, 26, 13, minuto)), numero })
}

// Doble de IndexedDB con una tabla en memoria (put, get, getAll, delete). El navegador prueba el almacenamiento real.
function prepararBase(t) {
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
  t.after(() => {
    if (anterior) Object.defineProperty(globalThis, 'indexedDB', anterior)
    else delete globalThis.indexedDB
  })
  return filas
}

test('cada persona lee solo sus renglones, en el orden en que los anotó', async (t) => {
  prepararBase(t)
  await guardarOperacion(cambio(carlos, 31, 'b'))
  await guardarOperacion(cambio(carlos, 30, 'a'))
  await guardarOperacion(cambio(juan, 29, 'c'))

  assert.deepEqual((await leerCola(5)).map((operacion) => operacion.operacionId), ['a', 'b'])
  assert.deepEqual((await leerCola(6)).map((operacion) => operacion.operacionId), ['c'])
  assert.deepEqual(await leerCola(null), [])
  assert.equal((await leerTodaLaCola()).length, 3)
})

test('guardar con el mismo número reemplaza el renglón (ej: al marcarlo en conflicto) y quitar lo borra', async (t) => {
  prepararBase(t)
  const operacion = cambio(carlos, 30, 'a')
  await guardarOperacion(operacion)
  await guardarOperacion(marcarConflicto(operacion, { mensaje: 'ya no vale' }))
  const [leida] = await leerCola(5)
  assert.equal(leida.estado, 'CONFLICTO')
  assert.equal(leida.conflicto.mensaje, 'ya no vale')

  await quitarOperacion('a')
  assert.deepEqual(await leerCola(5), [])
})

test('no se anota un renglón incompleto, y los rotos guardados se ignoran al leer', async (t) => {
  const filas = prepararBase(t)
  await assert.rejects(guardarOperacion({ operacionId: 'x' }), /faltan datos/)
  filas.set('roto', { operacionId: 'roto', usuarioId: 5 })
  assert.deepEqual(await leerCola(5), [])
})

test('cada cambio del cuaderno avisa a la pantalla', async (t) => {
  prepararBase(t)
  const anterior = globalThis.window
  globalThis.window = new EventTarget()
  t.after(() => { globalThis.window = anterior })
  let avisos = 0
  window.addEventListener(EVENTO_COLA, () => { avisos += 1 })

  await guardarOperacion(cambio(carlos, 30, 'a'))
  await quitarOperacion('a')
  assert.equal(avisos, 2)
})

test('si el navegador bloquea IndexedDB se informa el error', async (t) => {
  prepararBase(t)
  t.mock.method(indexedDB, 'open', () => { throw new Error('Almacenamiento bloqueado') })
  await assert.rejects(guardarOperacion(cambio(carlos, 30, 'a')), /Almacenamiento bloqueado/)
})

// ===================== Envío al backend =====================

function fetchFalso(t, { status = 200, cuerpo = null } = {}) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, opciones })
    return { ok: status >= 200 && status < 300, status, json: async () => cuerpo }
  })
  return pedidos
}

test('un cambio de estado va por PUT a la ventanilla con el número de comanda en la dirección', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { id: 7, estadoNombre: 'En curso' } })
  const respuesta = await enviarOperacion(cambio(carlos, 30, '3f2b8c1e-7a4d-4e8b-9c1f-2a6d5e4b3c21'))

  assert.equal(pedidos[0].url, '/api/sincronizacion/cambios-estado/3f2b8c1e-7a4d-4e8b-9c1f-2a6d5e4b3c21')
  assert.equal(pedidos[0].opciones.method, 'PUT')
  assert.deepEqual(JSON.parse(pedidos[0].opciones.body), { ordenId: 7, estadoId: 3, estadoAnteriorId: 2, hechoEn: '2026-10-26T13:30:00.000Z' })
  assert.equal(respuesta.estadoNombre, 'En curso')
})

test('una OT nueva va por PUT a altas-orden', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { id: 15 } })
  const alta = crearAltaOrden(carlos, { descripcion: 'Bache', tipo: 'BACHEO', origen: 'RECLAMO_VECINAL', prioridad: 'ALTA', lugarId: 3 },
    'Calle Córdoba', { ahora: new Date(Date.UTC(2026, 9, 26, 13, 0)), numero: 'n-2' })
  await enviarOperacion(alta)

  assert.equal(pedidos[0].url, '/api/sincronizacion/altas-orden/n-2')
  assert.deepEqual(JSON.parse(pedidos[0].opciones.body).orden,
    { descripcion: 'Bache', tipo: 'BACHEO', origen: 'RECLAMO_VECINAL', prioridad: 'ALTA', lugarId: 3 })
})

test('un conflicto llega como ErrorApi con el motivo del backend', async (t) => {
  fetchFalso(t, { status: 409, cuerpo: { estado: 409, mensaje: 'Mientras no tenías señal, la OT #7 pasó a Pendiente: tu cambio no se aplicó.',
    errores: { motivo: 'ESTADO_CAMBIADO', sePuedeAplicar: 'true', estadoActualId: '1', estadoActual: 'Pendiente' } } })

  await assert.rejects(enviarOperacion(cambio(carlos, 30, 'a')), (error) => error instanceof ErrorApi
    && error.estado === 409 && error.errores.motivo === 'ESTADO_CAMBIADO')
})
