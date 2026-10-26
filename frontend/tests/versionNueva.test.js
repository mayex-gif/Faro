import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENTO_VERSION_NUEVA, actualizarAhora, hayVersionNueva, vigilarVersiones } from '../src/offline/registrar.js'

// Un registro de service worker, una ventana y un documento de mentira
function preparar({ esperando = null, controlador = {} } = {}) {
  const registro = Object.assign(new EventTarget(), { waiting: esperando, installing: null, actualizaciones: 0 })
  registro.update = async () => { registro.actualizaciones += 1 }
  const ventana = new EventTarget()
  ventana.recargas = 0
  ventana.location = { reload: () => { ventana.recargas += 1 } }
  const documento = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const trabajador = Object.assign(new EventTarget(), { controller: controlador, getRegistration: async () => registro })
  let avisos = 0
  ventana.addEventListener(EVENTO_VERSION_NUEVA, () => { avisos += 1 })
  vigilarVersiones(registro, { ventana, documento, trabajador })
  return { registro, ventana, documento, trabajador, avisos: () => avisos }
}

test('si al abrir ya hay una versión esperando, se avisa', () => {
  assert.equal(preparar({ esperando: {} }).avisos(), 1)
})

test('la primera vez que se instala FARO no hay versión vieja: no se avisa', () => {
  const { registro, avisos } = preparar({ controlador: null })
  const nueva = Object.assign(new EventTarget(), { state: 'installing' })
  registro.installing = nueva
  registro.dispatchEvent(new Event('updatefound'))
  nueva.state = 'installed'
  nueva.dispatchEvent(new Event('statechange'))
  assert.equal(avisos(), 0)
})

test('cuando termina de bajar una versión nueva (deploy con FARO abierto), se avisa', () => {
  const { registro, avisos } = preparar()
  const nueva = Object.assign(new EventTarget(), { state: 'installing' })
  registro.installing = nueva
  registro.dispatchEvent(new Event('updatefound'))
  assert.equal(avisos(), 0)
  nueva.state = 'installed'
  nueva.dispatchEvent(new Event('statechange'))
  assert.equal(avisos(), 1)
})

test('al volver a la pestaña se pregunta si hay un deploy nuevo', () => {
  const { registro, documento } = preparar()
  documento.dispatchEvent(new Event('visibilitychange'))
  documento.visibilityState = 'hidden'
  documento.dispatchEvent(new Event('visibilitychange'))
  assert.equal(registro.actualizaciones, 1)
})

test('la página se recarga una sola vez y solo si la persona tocó "Actualizar"', async () => {
  const { ventana, trabajador } = preparar()
  trabajador.dispatchEvent(new Event('controllerchange')) // ej: la primera instalación toma el control
  assert.equal(ventana.recargas, 0)

  const mensajes = []
  const esperando = { postMessage: (mensaje) => mensajes.push(mensaje) }
  await actualizarAhora({ getRegistration: async () => ({ waiting: esperando }) })
  assert.deepEqual(mensajes, [{ tipo: 'ACTUALIZAR' }])
  trabajador.dispatchEvent(new Event('controllerchange'))
  trabajador.dispatchEvent(new Event('controllerchange'))
  assert.equal(ventana.recargas, 1)
})

test('hay versión nueva solo si hay una esperando y una vieja mandando', async () => {
  assert.equal(await hayVersionNueva({ controller: {}, getRegistration: async () => ({ waiting: {} }) }), true)
  assert.equal(await hayVersionNueva({ controller: null, getRegistration: async () => ({ waiting: {} }) }), false)
  assert.equal(await hayVersionNueva({ controller: {}, getRegistration: async () => ({ waiting: null }) }), false)
  assert.equal(await hayVersionNueva(undefined), false)
})
