import test from 'node:test'
import assert from 'node:assert/strict'
import { limpiarServiceWorkerEnDesarrollo } from '../src/offline/registrar.js'

function consolaFalsa() {
  const mensajes = []
  return { mensajes, info: (texto) => mensajes.push(texto) }
}

function preparar({ registros = [], caches = [] } = {}) {
  const borradas = []
  const trabajador = { getRegistrations: async () => registros }
  const almacenes = { keys: async () => caches, delete: async (nombre) => { borradas.push(nombre); return true } }
  return { trabajador, almacenes, borradas, consola: consolaFalsa() }
}

test('en desarrollo se da de baja un service worker viejo y se borra solo la caché de FARO', async () => {
  let dado = 0
  const registro = { unregister: async () => { dado += 1; return true } }
  const { trabajador, almacenes, borradas, consola } = preparar({ registros: [registro], caches: ['faro-app-abc123', 'otra-cosa'] })

  await limpiarServiceWorkerEnDesarrollo({ trabajador, almacenes, consola })

  assert.equal(dado, 1)
  assert.deepEqual(borradas, ['faro-app-abc123'])
  assert.match(consola.mensajes[0], /se quitó un service worker viejo/)
  assert.match(consola.mensajes.at(-1), /npm run pwa/)
})

test('si no había nada que limpiar, solo avisa cómo probar sin conexión', async () => {
  const { trabajador, almacenes, borradas, consola } = preparar()

  await limpiarServiceWorkerEnDesarrollo({ trabajador, almacenes, consola })

  assert.deepEqual(borradas, [])
  assert.equal(consola.mensajes.length, 1)
  assert.match(consola.mensajes[0], /dinosaurio/)
})

test('si el navegador no soporta service workers ni caché, no falla', async () => {
  const consola = consolaFalsa()

  await limpiarServiceWorkerEnDesarrollo({ trabajador: undefined, almacenes: undefined, consola })

  assert.equal(consola.mensajes.length, 1)
})

test('si el navegador falla al limpiar, no rompe la aplicación', async () => {
  const consola = consolaFalsa()
  const trabajador = { getRegistrations: async () => { throw new Error('sin permiso') } }

  await assert.doesNotReject(limpiarServiceWorkerEnDesarrollo({ trabajador, almacenes: undefined, consola }))
  assert.equal(consola.mensajes.length, 1)
})
