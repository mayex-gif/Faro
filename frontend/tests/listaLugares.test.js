import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FILTROS_LUGARES_VACIOS, FILTROS_TIPO, alternarTipo, contarTrabajos, filtrarLugares, subtituloLugar, textoTrabajos,
} from '../src/utils/listaLugares.js'

const orden = (id, prioridad) => ({ id, prioridad })
const resumen = (id, tipo, ordenes = [], estadoOperativo = true) => ({
  lugar: { id, nombre: `Lugar ${id}`, tipo, estadoOperativo },
  ordenes,
  principal: ordenes[0] ?? null,
})

const plaza = resumen(1, 'ESPACIO_VERDE', [orden(1, 'URGENTE'), orden(2, 'MEDIA')])
const luminaria = resumen(2, 'LUMINARIA', [], false)
const calle = resumen(3, 'CALLE', [orden(3, 'BAJA')])
const todos = [plaza, luminaria, calle]
const ids = (lista) => lista.map((r) => r.lugar.id)

test('sin botoncitos prendidos se ven todos los lugares', () => {
  assert.deepEqual(ids(filtrarLugares(todos, FILTROS_LUGARES_VACIOS)), [1, 2, 3])
})

test('"Con trabajos abiertos" deja solo los lugares que tienen alguno', () => {
  assert.deepEqual(ids(filtrarLugares(todos, { conTrabajos: true, tipos: [] })), [1, 3])
})

test('los botoncitos de tipo se suman entre sí y se combinan con "Con trabajos abiertos"', () => {
  assert.deepEqual(ids(filtrarLugares(todos, { conTrabajos: false, tipos: ['LUMINARIA', 'CALLE'] })), [2, 3])
  assert.deepEqual(ids(filtrarLugares(todos, { conTrabajos: true, tipos: ['LUMINARIA', 'CALLE'] })), [3])
})

test('alternarTipo prende y apaga un tipo sin cambiar los filtros que recibe', () => {
  const prendido = alternarTipo(FILTROS_LUGARES_VACIOS, 'CALLE')
  assert.deepEqual(prendido.tipos, ['CALLE'])
  assert.deepEqual(alternarTipo(prendido, 'CALLE').tipos, [])
  assert.deepEqual(FILTROS_LUGARES_VACIOS.tipos, [])
})

test('los botoncitos de tipo son Luminarias, Espacios verdes y Calles', () => {
  assert.deepEqual(FILTROS_TIPO.map((f) => f.etiqueta), ['Luminarias', 'Espacios verdes', 'Calles'])
})

test('contarTrabajos usa singular, plural y "Sin trabajos abiertos"', () => {
  assert.equal(contarTrabajos(0), 'Sin trabajos abiertos')
  assert.equal(contarTrabajos(1), '1 trabajo abierto')
  assert.equal(contarTrabajos(4), '4 trabajos abiertos')
})

test('textoTrabajos agrega cuántos son urgentes, solo si hay', () => {
  assert.equal(textoTrabajos(plaza.ordenes), '2 trabajos abiertos · 1 urgente')
  assert.equal(textoTrabajos([orden(1, 'URGENTE'), orden(2, 'URGENTE')]), '2 trabajos abiertos · 2 urgentes')
  assert.equal(textoTrabajos(calle.ordenes), '1 trabajo abierto')
})

test('subtituloLugar dice el tipo, si está fuera de servicio y cuántos trabajos tiene', () => {
  assert.equal(subtituloLugar(plaza), 'Espacio verde · 2 trabajos abiertos')
  assert.equal(subtituloLugar(luminaria), 'Luminaria · Fuera de servicio · Sin trabajos abiertos')
})
