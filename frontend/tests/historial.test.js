import test from 'node:test'
import assert from 'node:assert/strict'
import { fechaDelHito, lineaDeTiempo, resumenDeHistorial } from '../src/utils/historial.js'

// Solo datos en memoria: no se modifica la base.
const estados = [
  { id: 1, nombre: 'Pendiente', cierre: false },
  { id: 2, nombre: 'Finalizada', cierre: true },
]
const ordenes = [
  { id: 1, estadoId: 2, fechaCreacion: '2026-08-01T08:00:00' },
  { id: 2, estadoId: 1, fechaCreacion: '2026-10-01T08:00:00' },
  { id: 3, estadoId: 2, fechaCreacion: '2026-09-01T08:00:00' },
]

test('lo más reciente queda arriba', () => {
  assert.deepEqual(lineaDeTiempo(ordenes, estados).map((i) => i.orden.id), [2, 3, 1])
})

test('se puede ver solo lo abierto o solo lo cerrado', () => {
  assert.deepEqual(lineaDeTiempo(ordenes, estados, 'abiertas').map((i) => i.orden.id), [2])
  assert.deepEqual(lineaDeTiempo(ordenes, estados, 'cerradas').map((i) => i.orden.id), [3, 1])
})

test('si el backend informa fechaFin, esa fecha ubica la intervención en la línea de tiempo', () => {
  const conFin = [{ id: 1, estadoId: 2, fechaCreacion: '2026-08-01T08:00:00', fechaFin: '2026-10-05T10:00:00' }, ordenes[1]]
  assert.equal(fechaDelHito(conFin[0]), '2026-10-05T10:00:00')
  assert.deepEqual(lineaDeTiempo(conFin, estados).map((i) => i.orden.id), [1, 2])
})

test('no cambia la lista original', () => {
  const copia = [...ordenes]
  lineaDeTiempo(ordenes, estados)
  assert.deepEqual(ordenes, copia)
})

test('cuenta total, abiertas y cerradas', () => {
  assert.deepEqual(resumenDeHistorial(ordenes, estados), { total: 3, cerradas: 2, abiertas: 1 })
  assert.deepEqual(resumenDeHistorial([], estados), { total: 0, cerradas: 0, abiertas: 0 })
})
