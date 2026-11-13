import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORIAS_LUGAR, TIPOS_LUGAR, claseEstadoLugar, describirUbicacion, lugaresDeCategoria, textoEstadoLugar, tiposDeCategoria, tiposParaAgregar,
} from '../src/utils/lugares.js'

const lugares = [
  { id: 1, tipo: 'ESPACIO_VERDE', estadoOperativo: true },
  { id: 2, tipo: 'LUMINARIA', estadoOperativo: false, instalada: true },
  { id: 3, tipo: 'CALLE', estadoOperativo: true },
  { id: 4, tipo: 'LUMINARIA', estadoOperativo: false, instalada: false },
]

test('Infraestructura muestra lugares; Calles y Luminarias se gestionan en sus pestañas del mapa', () => {
  assert.deepEqual(CATEGORIAS_LUGAR.infraestructura, ['ESPACIO_VERDE'])
  assert.deepEqual(lugaresDeCategoria(lugares, 'infraestructura').map((l) => l.id), [1])
  assert.deepEqual(lugaresDeCategoria(lugares, 'luminarias').map((l) => l.id), [2, 4])
})

test('sin categoría (o una desconocida) se ven todos los tipos', () => {
  assert.deepEqual(tiposDeCategoria(undefined), ['ESPACIO_VERDE', 'CALLE', 'LUMINARIA'])
  assert.equal(lugaresDeCategoria(lugares, 'otra').length, 4)
})

test('el estado dice "A futuro" para las luminarias que no se instalaron', () => {
  assert.equal(textoEstadoLugar(lugares[0]), 'Funciona')
  assert.equal(textoEstadoLugar(lugares[1]), 'Fuera de servicio')
  assert.equal(textoEstadoLugar(lugares[3]), 'A futuro')
  assert.equal(claseEstadoLugar(lugares[3]), 'estado estado-pendiente')
  assert.equal(claseEstadoLugar(lugares[1]), 'estado estado-falla')
})

test('"Agregar" ofrece Lugar, Calle y Luminaria desde todas las pestañas del mapa', () => {
  assert.deepEqual(tiposParaAgregar('todo').map((tipo) => TIPOS_LUGAR[tipo]), ['Lugar', 'Calle', 'Luminaria'])
  assert.deepEqual(tiposParaAgregar('luminarias'), ['ESPACIO_VERDE', 'CALLE', 'LUMINARIA'])
  assert.deepEqual(tiposParaAgregar('calles'), ['ESPACIO_VERDE', 'CALLE', 'LUMINARIA'])
  assert.deepEqual(tiposParaAgregar('otra'), tiposParaAgregar('todo'))
})

test('describirUbicacion dice cuántos tramos tiene una calle cortada (MultiLineString)', () => {
  assert.equal(describirUbicacion({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]], [[4, 4], [5, 5]]] }), 'Línea de 3 tramos')
  assert.equal(describirUbicacion({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] }), 'Línea de 1 tramo')
  assert.equal(describirUbicacion({ type: 'LineString', coordinates: [[0, 0], [1, 1]] }), 'Línea de 2 puntos')
})
