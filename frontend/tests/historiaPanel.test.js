import test from 'node:test'
import assert from 'node:assert/strict'
import { fechaCorta, lineaNovedad, ultimasNovedades } from '../src/utils/historia.js'

test('fechaCorta muestra día/mes sin ceros adelante', () => {
  assert.equal(fechaCorta('2026-10-07T19:04:12.82164'), '7/10')
  assert.equal(fechaCorta('2026-01-15T08:00:00'), '15/1')
  assert.equal(fechaCorta(undefined), '')
})

test('ultimasNovedades deja las primeras (las más nuevas), 3 por defecto', () => {
  assert.deepEqual(ultimasNovedades([5, 4, 3, 2, 1]), [5, 4, 3])
  assert.deepEqual(ultimasNovedades([5, 4], 3), [5, 4])
})

test('lineaNovedad dice qué trabajo fue y cuándo', () => {
  const evento = { tipo: 'CAMBIO_ESTADO', fecha: '2026-10-11T09:00:00', ordenDescripcion: 'Limpieza general de la plaza' }
  assert.equal(lineaNovedad(evento), 'Limpieza general de la plaza · 11/10')
})

test('en una reasignación, lineaNovedad dice quién la tenía antes', () => {
  const evento = { tipo: 'CUADRILLA_REASIGNADA', fecha: '2026-10-12T09:00:00', ordenDescripcion: 'Poda', cuadrillaAnterior: 'Cuadrilla Verde' }
  assert.equal(lineaNovedad(evento), 'Antes la tenía Cuadrilla Verde · 12/10')
})
