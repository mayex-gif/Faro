import test from 'node:test'
import assert from 'node:assert/strict'
import { CENTRO_PUEBLO, ZONA_PUEBLO, separarPorZona } from '../src/utils/zona.js'

const punto = (longitud, latitud) => ({ type: 'Point', coordinates: [longitud, latitud] })
const nombres = (lista) => lista.map((lugar) => lugar.nombre)

test('la plaza principal está en el centro de la zona', () => {
  assert.ok(ZONA_PUEBLO.sur < CENTRO_PUEBLO.latitud && CENTRO_PUEBLO.latitud < ZONA_PUEBLO.norte)
  assert.ok(ZONA_PUEBLO.oeste < CENTRO_PUEBLO.longitud && CENTRO_PUEBLO.longitud < ZONA_PUEBLO.este)
})

test('los lugares del pueblo quedan dentro; los mal cargados, fuera', () => {
  const lugares = [
    { nombre: 'Plaza principal', ubicacion: punto(-64.14037918, -31.13398511) },
    { nombre: 'Parque en el polo norte', ubicacion: punto(-64.14, 90) },
    { nombre: 'Luminaria en Buenos Aires', ubicacion: punto(-58.38, -34.6) },
  ]
  const { dentro, fuera } = separarPorZona(lugares)
  assert.deepEqual(nombres(dentro), ['Plaza principal'])
  assert.deepEqual(nombres(fuera), ['Parque en el polo norte', 'Luminaria en Buenos Aires'])
})

test('sin ubicación o con una ubicación inválida, el lugar queda fuera', () => {
  const { fuera } = separarPorZona([
    { nombre: 'Sin ubicación', ubicacion: null },
    { nombre: 'Inválida', ubicacion: { type: 'Point', coordinates: ['a', 'b'] } },
  ])
  assert.deepEqual(nombres(fuera), ['Sin ubicación', 'Inválida'])
})

test('una calle que empieza en el pueblo y sale de la zona cuenta como dentro', () => {
  const calle = { nombre: 'Camino a Córdoba', ubicacion: { type: 'LineString', coordinates: [[-64.14, -31.13], [-64.30, -31.30]] } }
  assert.deepEqual(nombres(separarPorZona([calle]).dentro), ['Camino a Córdoba'])
})
