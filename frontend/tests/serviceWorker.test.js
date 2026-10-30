import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const codigo = await readFile(new URL('../scripts/service-worker.js', import.meta.url), 'utf8')

// El worker corre en un "sandbox" con caches, fetch y self de mentira.
// red: qué hace fetch → 'sin red' (falla), 'ok' (responde la red), 'error' (responde 500), 'colgada' (no responde nunca)
function preparar({ red = 'sin red', esperaInmediata = false } = {}) {
  const eventos = {}
  const eliminados = []
  const guardados = []
  let saltoLaEspera = false
  const guardadas = { '/index.html': 'index guardado', '/sin-conexion.html': 'consulta guardada', '/assets/app.js': 'app.js', '/assets/de-la-version-nueva.js': 'nuevo.js' }
  const cache = { addAll: async (archivos) => guardados.push(...archivos) }
  runInNewContext(codigo, {
    URL,
    setTimeout: esperaInmediata ? (accion) => { accion(); return 0 } : setTimeout,
    clearTimeout,
    CACHE_FARO: 'faro-app-nueva', ARCHIVOS_FARO: ['/index.html', '/sin-conexion.html', '/assets/app.js'],
    self: {
      location: { origin: 'https://faro.test' }, clients: { claim: async () => {} },
      skipWaiting: () => { saltoLaEspera = true },
      addEventListener: (nombre, accion) => { eventos[nombre] = accion },
    },
    caches: {
      open: async () => cache,
      match: async (ruta) => (guardadas[ruta] ? { pagina: guardadas[ruta] } : undefined),
      keys: async () => ['faro-app-anterior', 'faro-app-nueva', 'otra-aplicacion'],
      delete: async (nombre) => eliminados.push(nombre),
    },
    fetch: async () => {
      if (red === 'ok') return { ok: true, pagina: 'de la red' }
      if (red === 'error') return { ok: false, status: 500 }
      if (red === 'colgada') return new Promise(() => {})
      throw new Error('Sin red')
    },
  })
  return { eventos, eliminados, guardados, saltoLaEspera: () => saltoLaEspera }
}

async function pedir(eventos, ruta, modo = 'cors') {
  let respuesta
  eventos.fetch({ request: { url: `https://faro.test${ruta}`, method: 'GET', mode: modo }, respondWith: (promesa) => { respuesta = promesa } })
  return respuesta ? (await respuesta).pagina : 'no lo intercepta'
}

test('al instalar guarda los recursos del build; al activar solo elimina versiones anteriores de FARO', async () => {
  const { eventos, eliminados, guardados } = preparar()
  let trabajo
  eventos.install({ waitUntil: (promesa) => { trabajo = promesa } })
  await trabajo
  assert.deepEqual(guardados, ['/index.html', '/sin-conexion.html', '/assets/app.js'])
  eventos.activate({ waitUntil: (promesa) => { trabajo = promesa } })
  await trabajo
  assert.deepEqual(eliminados, ['faro-app-anterior'])
})

test('sin red sigue sirviendo el ingreso, la consulta local y el código guardados', async () => {
  const { eventos } = preparar({ red: 'sin red' })
  assert.equal(await pedir(eventos, '/', 'navigate'), 'index guardado')
  assert.equal(await pedir(eventos, '/sin-conexion.html', 'navigate'), 'consulta guardada')
  assert.equal(await pedir(eventos, '/assets/app.js'), 'app.js')
})

test('con red, la página se pide primero a la red: después de un deploy se ve la versión nueva', async () => {
  const { eventos } = preparar({ red: 'ok' })
  assert.equal(await pedir(eventos, '/', 'navigate'), 'de la red')
  assert.equal(await pedir(eventos, '/sin-conexion.html', 'navigate'), 'de la red')
})

test('si la red responde con error o tarda demasiado, se usa la página guardada', async () => {
  assert.equal(await pedir(preparar({ red: 'error' }).eventos, '/', 'navigate'), 'index guardado')
  assert.equal(await pedir(preparar({ red: 'colgada', esperaInmediata: true }).eventos, '/', 'navigate'), 'index guardado')
})

test('los archivos del build se buscan en todas las versiones guardadas (también la que espera)', async () => {
  const { eventos } = preparar({ red: 'sin red' })
  assert.equal(await pedir(eventos, '/assets/de-la-version-nueva.js'), 'nuevo.js')
})

test('la versión nueva solo pasa a mandar cuando la persona toca "Actualizar"', () => {
  const { eventos, saltoLaEspera } = preparar()
  eventos.message({ data: { tipo: 'OTRA_COSA' } })
  assert.equal(saltoLaEspera(), false)
  eventos.message({ data: { tipo: 'ACTUALIZAR' } })
  assert.equal(saltoLaEspera(), true)
})

test('el worker no intercepta la API, los cambios de estado ni recursos de otros sitios', () => {
  const { eventos } = preparar()
  for (const [url, method] of [['https://faro.test/api/auth/login', 'POST'], ['https://faro.test/api/ordenes-trabajo', 'GET'], ['https://faro.test/api/ordenes-trabajo/1/estado', 'PATCH'], ['https://faro.test/api/sincronizacion/cambios-estado/x', 'PUT'], ['https://tiles.example/1/2.png', 'GET'], ['https://faro.test/otra-pagina', 'GET']]) {
    let interceptado = false
    eventos.fetch({ request: { url, method, mode: 'navigate' }, respondWith: () => { interceptado = true } })
    assert.equal(interceptado, false)
  }
})
