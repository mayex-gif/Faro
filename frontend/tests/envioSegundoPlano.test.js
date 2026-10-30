import test from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { runInNewContext } from 'node:vm'
import { codigoDelTrabajador, sinModulos } from '../scripts/armar-sw.js'
import { crearCambioEstado, marcarConflicto } from '../src/offline/datosCola.js'

// Se prueba el sw.js ARMADO (como en el build): el worker + las reglas del cuaderno + el envío en segundo plano.
const codigo = await codigoDelTrabajador()
const vigente = `cabecera.${Buffer.from(JSON.stringify({ exp: 4000000000 })).toString('base64url')}.firma`
const vencido = `cabecera.${Buffer.from(JSON.stringify({ exp: 1000 })).toString('base64url')}.firma`
const carlos = { id: 5, nombre: 'Carlos', apellido: 'Rodríguez', email: 'capataz.verde@generalpaz.gob.ar' }
const enCurso = { id: 3, nombre: 'En curso', color: '#9A4A12' }

function cambio(ordenId, minuto, numero) {
  return crearCambioEstado(carlos, { id: ordenId, estadoId: 2, estadoNombre: 'Planificada' }, enCurso,
    { ahora: new Date(Date.UTC(2026, 9, 26, 13, minuto)), numero })
}

// IndexedDB de mentira con sus dos tablas (cada una con su clave) y un fetch de mentira
function preparar({ operaciones = [], sesion = { id: 'actual', usuarioId: 5, token: vigente, apiBase: 'https://faro-backend.test/api' }, responder }) {
  const tablas = { operaciones: new Map(), sesion: new Map() }
  const claves = { operaciones: 'operacionId', sesion: 'id' }
  for (const operacion of operaciones) tablas.operaciones.set(operacion.operacionId, structuredClone(operacion))
  if (sesion) tablas.sesion.set('actual', structuredClone(sesion))
  const base = { close() {}, transaction(nombre) {
    const transaccion = { abort() {}, objectStore() {
      const filas = tablas[nombre]
      function pedido(resultado) {
        queueMicrotask(() => transaccion.oncomplete())
        return { result: resultado }
      }
      return {
        put: (valor) => { filas.set(valor[claves[nombre]], structuredClone(valor)); return pedido(undefined) },
        get: (clave) => pedido(structuredClone(filas.get(clave))),
        getAll: () => pedido([...filas.values()].map((fila) => structuredClone(fila))),
        delete: (clave) => { filas.delete(clave); return pedido(undefined) },
      }
    } }
    return transaccion
  } }
  const pedidos = []
  const eventos = {}
  runInNewContext(codigo, {
    URL, atob, JSON, Date, Promise, Map, Set, Number, String, Boolean, Math, Error, structuredClone, queueMicrotask, setTimeout, clearTimeout,
    CACHE_FARO: 'faro-app-x', ARCHIVOS_FARO: [],
    indexedDB: { open() { const pedido = { result: base }; queueMicrotask(() => pedido.onsuccess()); return pedido } },
    self: { location: { origin: 'https://faro.test' }, clients: { claim: async () => {} }, navigator: {}, addEventListener: (nombre, accion) => { eventos[nombre] = accion } },
    caches: {},
    fetch: async (url, opciones) => {
      pedidos.push({ url, opciones })
      return responder(url, opciones)
    },
  })
  async function despertar(tag = 'faro-cola-cambios') {
    let trabajo = null
    eventos.sync({ tag, waitUntil: (promesa) => { trabajo = promesa } })
    return trabajo
  }
  return { tablas, pedidos, despertar }
}

const bien = () => ({ ok: true, status: 200, json: async () => ({}) })

test('al volver la señal, el worker manda el cuaderno en orden con la cuenta guardada y lo vacía', async () => {
  const { tablas, pedidos, despertar } = preparar({ operaciones: [cambio(8, 31, 'b'), cambio(7, 30, 'a')], responder: bien })
  await despertar()
  assert.deepEqual(pedidos.map((pedido) => pedido.url), [
    'https://faro-backend.test/api/sincronizacion/cambios-estado/a',
    'https://faro-backend.test/api/sincronizacion/cambios-estado/b',
  ])
  assert.equal(pedidos[0].opciones.method, 'PUT')
  assert.equal(pedidos[0].opciones.headers.Authorization, `Bearer ${vigente}`)
  assert.deepEqual(JSON.parse(pedidos[0].opciones.body), { ordenId: 7, estadoId: 3, estadoAnteriorId: 2, hechoEn: '2026-10-26T13:30:00.000Z' })
  assert.equal(tablas.operaciones.size, 0)
})

test('un conflicto queda marcado para que la persona decida al abrir FARO, y sigue con el resto', async () => {
  const { tablas, despertar } = preparar({
    operaciones: [cambio(7, 30, 'a'), cambio(8, 31, 'b')],
    responder: (url) => (url.endsWith('/a')
      ? { ok: false, status: 409, json: async () => ({ mensaje: 'Mientras no tenías señal, la OT #7 pasó a Cancelada: tu cambio no se aplicó.',
        errores: { motivo: 'ORDEN_CERRADA', sePuedeAplicar: 'false', estadoActualId: '5', estadoActual: 'Cancelada' } }) }
      : bien()),
  })
  await despertar()
  assert.deepEqual([...tablas.operaciones.keys()], ['a'])
  assert.equal(tablas.operaciones.get('a').estado, 'CONFLICTO')
  assert.equal(tablas.operaciones.get('a').conflicto.motivo, 'ORDEN_CERRADA')
})

test('sin señal falla (el navegador lo reintenta más tarde) y no pierde nada', async () => {
  const { tablas, pedidos, despertar } = preparar({ operaciones: [cambio(7, 30, 'a'), cambio(8, 31, 'b')], responder: () => { throw new TypeError('Failed to fetch') } })
  await assert.rejects(despertar(), /Failed to fetch/)
  assert.equal(pedidos.length, 1)
  assert.equal(tablas.operaciones.size, 2)
  assert.equal(tablas.operaciones.get('a').intentos, 1)
})

test('si el servidor falla (5xx) también se reintenta más tarde', async () => {
  const { tablas, despertar } = preparar({ operaciones: [cambio(7, 30, 'a')], responder: () => ({ ok: false, status: 503, json: async () => null }) })
  await assert.rejects(despertar(), /503/)
  assert.equal(tablas.operaciones.size, 1)
})

test('con un 401 se olvida la cuenta guardada y el cuaderno espera intacto a que la persona vuelva a entrar', async () => {
  const operacion = cambio(7, 30, 'a')
  const { tablas, despertar } = preparar({ operaciones: [operacion], responder: () => ({ ok: false, status: 401, json: async () => ({ mensaje: 'No autorizado' }) }) })
  await despertar()
  assert.equal(tablas.sesion.size, 0)
  assert.deepEqual(tablas.operaciones.get('a'), operacion)
})

test('sin cuenta guardada (se cerró sesión) o con el token vencido no se manda nada', async () => {
  for (const sesion of [null, { id: 'actual', usuarioId: 5, token: vencido, apiBase: 'https://faro-backend.test/api' }]) {
    const { pedidos, despertar } = preparar({ operaciones: [cambio(7, 30, 'a')], sesion, responder: bien })
    await despertar()
    assert.equal(pedidos.length, 0)
  }
})

test('solo manda los renglones de la cuenta guardada y respeta los que esperan una decisión', async () => {
  const deJuan = crearCambioEstado({ id: 6, nombre: 'Juan' }, { id: 9, estadoId: 2 }, enCurso, { numero: 'j' })
  const chocado = marcarConflicto(cambio(7, 30, 'a'), { mensaje: '…' })
  const despues = crearCambioEstado(carlos, { id: 7, estadoId: 3 }, { id: 4, nombre: 'Finalizada' },
    { ahora: new Date(Date.UTC(2026, 9, 26, 13, 31)), numero: 'b' })
  const { pedidos, despertar } = preparar({ operaciones: [deJuan, chocado, despues], responder: bien })
  await despertar()
  assert.equal(pedidos.length, 0) // lo de Juan no es de esta cuenta; "b" espera que Carlos decida sobre "a"
})

test('otros avisos de sincronización no lo despiertan', async () => {
  const { despertar } = preparar({ operaciones: [], responder: bien })
  assert.equal(await despertar('otra-cosa'), null)
})

test('al armar sw.js se sacan los import y export (el worker no es un módulo)', () => {
  assert.equal(sinModulos("import { a } from './b.js'\nexport const X = 1\nexport async function f() {}\nexport function g() {}"),
    '\nconst X = 1\nasync function f() {}\nfunction g() {}')
})
