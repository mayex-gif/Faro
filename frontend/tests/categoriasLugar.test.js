import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORIAS_LUGAR, claseEstadoLugar, lugaresDeCategoria, textoEstadoLugar, tiposDeCategoria,
} from '../src/utils/lugares.js'

const lugares = [
  { id: 1, tipo: 'ESPACIO_VERDE', estadoOperativo: true },
  { id: 2, tipo: 'LUMINARIA', estadoOperativo: false, instalada: true },
  { id: 3, tipo: 'CALLE', estadoOperativo: true },
  { id: 4, tipo: 'LUMINARIA', estadoOperativo: false, instalada: false },
]

test('Infraestructura tiene espacios verdes y calles; las luminarias van aparte', () => {
  assert.deepEqual(CATEGORIAS_LUGAR.infraestructura, ['ESPACIO_VERDE', 'CALLE'])
  assert.deepEqual(lugaresDeCategoria(lugares, 'infraestructura').map((l) => l.id), [1, 3])
  assert.deepEqual(lugaresDeCategoria(lugares, 'luminarias').map((l) => l.id), [2, 4])
})

test('sin categoría (o una desconocida) se ven todos los tipos', () => {
  assert.deepEqual(tiposDeCategoria(undefined), ['ESPACIO_VERDE', 'CALLE', 'LUMINARIA'])
  assert.equal(lugaresDeCategoria(lugares, 'otra').length, 4)
})

test('el estado dice "Falta poner" para las luminarias que no se instalaron', () => {
  assert.equal(textoEstadoLugar(lugares[0]), 'Funciona')
  assert.equal(textoEstadoLugar(lugares[1]), 'Fuera de servicio')
  assert.equal(textoEstadoLugar(lugares[3]), 'Falta poner')
  assert.equal(claseEstadoLugar(lugares[3]), 'estado estado-pendiente')
  assert.equal(claseEstadoLugar(lugares[1]), 'estado estado-falla')
})
