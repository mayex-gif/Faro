import test from 'node:test'
import assert from 'node:assert/strict'
import { buscar, normalizar } from '../src/utils/buscador.js'

const lugares = [
  { id: 1, nombre: 'Plaza San Martín' },
  { id: 2, nombre: 'Luminaria Av. San Martín 450' },
  { id: 3, nombre: 'Calle Belgrano, cuadra 300' },
  { id: 4, nombre: 'Plazoleta de la estación' },
]
const ordenes = [
  { id: 7, descripcion: 'Poda de fresnos', lugarNombre: 'Plaza San Martín', fechaCreacion: '2026-10-01T10:00:00' },
  { id: 12, descripcion: 'Bacheo frente al 320', lugarNombre: 'Calle Belgrano, cuadra 300', fechaCreacion: '2026-10-05T10:00:00' },
  { id: 15, descripcion: 'Cambiar el foco', lugarNombre: 'Luminaria Av. San Martín 450', fechaCreacion: '2026-10-09T10:00:00' },
]
const nombres = (lista) => lista.map((x) => x.nombre ?? x.descripcion)

test('normalizar saca mayúsculas, tildes y espacios de los costados', () => {
  assert.equal(normalizar('  Plaza San MARTÍN '), 'plaza san martin')
  assert.equal(normalizar(undefined), '')
})

test('encuentra lugares sin importar tildes ni mayúsculas', () => {
  assert.deepEqual(nombres(buscar('martin', lugares, []).lugares), ['Luminaria Av. San Martín 450', 'Plaza San Martín'])
})

test('cada palabra tiene que estar, en cualquier orden', () => {
  assert.deepEqual(nombres(buscar('martin plaza', lugares, []).lugares), ['Plaza San Martín'])
})

test('los lugares que empiezan con lo buscado van primero', () => {
  assert.deepEqual(nombres(buscar('plaz', lugares, []).lugares), ['Plaza San Martín', 'Plazoleta de la estación'])
})

test('los trabajos se encuentran por descripción o por el nombre de su lugar, los más nuevos primero', () => {
  assert.deepEqual(nombres(buscar('poda', [], ordenes).trabajos), ['Poda de fresnos'])
  assert.deepEqual(nombres(buscar('san martin', [], ordenes).trabajos), ['Cambiar el foco', 'Poda de fresnos'])
})

test('"12" encuentra la OT número 12 primero', () => {
  assert.equal(buscar('12', [], ordenes).trabajos[0].id, 12)
})

test('"#3" encuentra solo la OT 3, aunque otros nombres tengan un 3', () => {
  const conTres = [...ordenes, { id: 3, descripcion: 'Pintar bancos', lugarNombre: 'Plaza San Martín' }]
  assert.deepEqual(buscar('#3', lugares, conTres), { lugares: [], trabajos: [conTres[3]] })
  assert.deepEqual(buscar('#99', lugares, conTres), { lugares: [], trabajos: [] })
})

test('con menos de 2 letras no busca', () => {
  assert.deepEqual(buscar('p', lugares, ordenes), { lugares: [], trabajos: [] })
  assert.deepEqual(buscar('   ', lugares, ordenes), { lugares: [], trabajos: [] })
})

test('devuelve como máximo la cantidad pedida', () => {
  assert.equal(buscar('a', lugares, ordenes).lugares.length, 0)
  assert.equal(buscar('la', lugares, ordenes, 2).lugares.length, 2)
})
