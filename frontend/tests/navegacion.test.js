import test from 'node:test'
import assert from 'node:assert/strict'
import { INICIO, MAS, NUEVO, SECCIONES, estaEnMas, tituloDe } from '../src/utils/navegacion.js'

const todas = [...SECCIONES, ...MAS]

test('la barra tiene Mapa, Trabajos y Cuadrillas, en ese orden', () => {
  assert.deepEqual(SECCIONES.map((s) => s.titulo), ['Mapa', 'Trabajos', 'Cuadrillas'])
})

test('FARO arranca en el mapa, que es una de las secciones de la barra', () => {
  assert.equal(INICIO, 'mapa')
  assert.ok(SECCIONES.some((s) => s.clave === INICIO))
})

test('ninguna pantalla se pierde: están las seis y ninguna aparece dos veces', () => {
  const claves = todas.map((s) => s.clave)
  assert.equal(new Set(claves).size, claves.length)
  assert.deepEqual([...claves].sort(), ['asignacion', 'ficha', 'infraestructura', 'mapa', 'ordenes', 'tareas'])
})

test('"+ Nuevo" solo lleva a pantallas que existen en el menú', () => {
  for (const opcion of NUEVO) {
    assert.ok(todas.some((s) => s.clave === opcion.clave), `${opcion.clave} no está en el menú`)
  }
})

test('estaEnMas reconoce las pantallas del menú "Más"', () => {
  assert.equal(estaEnMas('infraestructura'), true)
  assert.equal(estaEnMas('tareas'), true)
  assert.equal(estaEnMas('mapa'), false)
  assert.equal(estaEnMas('no-existe'), false)
})

test('tituloDe usa el nombre de la barra y, si no conoce la clave, "FARO"', () => {
  assert.equal(tituloDe('ordenes'), 'Trabajos')
  assert.equal(tituloDe('ficha'), 'Ficha histórica')
  assert.equal(tituloDe('no-existe'), 'FARO')
})