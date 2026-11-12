import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarCalles, callesDe, esCalle, resumirCalles, textoDeLaCalle } from '../src/utils/calles.js'

const orden = (id, prioridad, tipo = 'BACHEO') => ({ id, prioridad, tipo })
const resumen = (id, nombre, tipo, ordenes = [], estadoOperativo = true) => ({
  lugar: { id, nombre, tipo, estadoOperativo },
  ordenes,
  principal: ordenes[0] ?? null,
})

const velez = resumen(1, 'Vélez Sarsfield', 'CALLE', [orden(10, 'URGENTE'), orden(11, 'BAJA', 'LIMPIEZA')])
const ortiz = resumen(2, 'Ortiz y Herrera', 'CALLE', [orden(12, 'BAJA')])
const salta = resumen(3, 'Salta', 'CALLE', [], false)
const catamarca = resumen(4, 'Catamarca', 'CALLE')
const plaza = resumen(5, 'Plaza principal', 'ESPACIO_VERDE', [orden(13, 'URGENTE')])
const poste = resumen(6, 'Luminaria Salta', 'LUMINARIA')
const todos = [salta, plaza, ortiz, poste, catamarca, velez]
const nombres = (lista) => lista.map((r) => r.lugar.nombre)

test('esCalle reconoce solo el tipo CALLE', () => {
  assert.equal(esCalle(velez.lugar), true)
  assert.equal(esCalle(plaza.lugar), false)
  assert.equal(esCalle(undefined), false)
})

test('callesDe deja solo las calles: primero las que tienen trabajos (más urgentes arriba), después por nombre', () => {
  assert.deepEqual(nombres(callesDe(todos)), ['Vélez Sarsfield', 'Ortiz y Herrera', 'Catamarca', 'Salta'])
})

test('resumirCalles cuenta las calles con trabajos, sin trabajos y fuera de servicio', () => {
  assert.deepEqual(resumirCalles(callesDe(todos)), { total: 4, conTrabajos: 2, sinTrabajos: 2, fueraDeServicio: 1 })
  assert.deepEqual(resumirCalles([]), { total: 0, conTrabajos: 0, sinTrabajos: 0, fueraDeServicio: 0 })
})

test('buscarCalles no distingue mayúsculas ni tildes, y sin texto devuelve todas', () => {
  const calles = callesDe(todos)
  assert.deepEqual(nombres(buscarCalles(calles, 'velez')), ['Vélez Sarsfield'])
  assert.deepEqual(nombres(buscarCalles(calles, '  HERRERA ')), ['Ortiz y Herrera'])
  assert.equal(buscarCalles(calles, '').length, 4)
  assert.equal(buscarCalles(calles, 'mitre').length, 0)
})

test('textoDeLaCalle dice la OT más urgente y cuántas hay; sin trabajos, si está fuera de servicio', () => {
  assert.equal(textoDeLaCalle(velez), 'OT #10 · Bacheo · Urgente · 2 trabajos abiertos')
  assert.equal(textoDeLaCalle(ortiz), 'OT #12 · Bacheo · Baja')
  assert.equal(textoDeLaCalle(salta), 'Fuera de servicio · Sin trabajos abiertos')
  assert.equal(textoDeLaCalle(catamarca), 'Sin trabajos abiertos')
})
