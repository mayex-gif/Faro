import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const codigo = await readFile(new URL('../scripts/service-worker.js', import.meta.url), 'utf8')

function preparar() {
  const eventos = {}
  const eliminados = []
  const guardados = []
  const cache = {
    addAll: async (archivos) => guardados.push(...archivos),
    match: async (ruta) => ['/index.html', '/sin-conexion.html', '/assets/app.js'].includes(ruta) ? { pagina: ruta } : undefined,
  }
  runInNewContext(codigo, {
    URL,
    CACHE_FARO: 'faro-app-nueva', ARCHIVOS_FARO: ['/index.html', '/sin-conexion.html', '/assets/app.js'],
    self: { location: { origin: 'https://faro.test' }, clients: { claim: async () => {} }, addEventListener: (nombre, accion) => { eventos[nombre] = accion } },
    caches: { open: async () => cache, keys: async () => ['faro-app-anterior', 'faro-app-nueva', 'otra-aplicacion'], delete: async (nombre) => eliminados.push(nombre) },
    fetch: async () => { throw new Error('Sin red') },
  })
  return { eventos, eliminados, guardados }
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
  const { eventos } = preparar()
  for (const [ruta, modo, esperada] of [['/', 'navigate', '/index.html'], ['/sin-conexion.html', 'navigate', '/sin-conexion.html'], ['/assets/app.js', 'cors', '/assets/app.js']]) {
    let respuesta
    eventos.fetch({ request: { url: `https://faro.test${ruta}`, method: 'GET', mode: modo }, respondWith: (promesa) => { respuesta = promesa } })
    assert.equal((await respuesta).pagina, esperada)
  }
})

test('el worker no intercepta la API, los cambios de estado ni recursos de otros sitios', () => {
  const { eventos } = preparar()
  for (const [url, method] of [['https://faro.test/api/auth/login', 'POST'], ['https://faro.test/api/ordenes-trabajo', 'GET'], ['https://faro.test/api/ordenes-trabajo/1/estado', 'PATCH'], ['https://tiles.example/1/2.png', 'GET']]) {
    let interceptado = false
    eventos.fetch({ request: { url, method }, respondWith: () => { interceptado = true } })
    assert.equal(interceptado, false)
  }
})
