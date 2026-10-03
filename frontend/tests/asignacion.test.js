import test from 'node:test'
import assert from 'node:assert/strict'
import { cuadrillasParaOrden, ordenesPendientes } from '../src/utils/asignacion.js'

// Solo datos en memoria: no se modifica la base.
const estados = [
  { id: 1, nombre: 'Pendiente', inicial: true, cierre: false },
  { id: 2, nombre: 'En curso', inicial: false, cierre: false },
  { id: 3, nombre: 'Finalizada', inicial: false, cierre: true },
]
const ordenes = [
  { id: 1, tipo: 'PODA', prioridad: 'MEDIA', estadoId: 1, fechaCreacion: '2026-10-01T08:00:00' },
  { id: 2, tipo: 'PODA', prioridad: 'URGENTE', estadoId: 1, fechaCreacion: '2026-10-02T08:00:00' },
  { id: 3, tipo: 'BACHEO', prioridad: 'MEDIA', estadoId: 2, fechaCreacion: '2026-09-30T08:00:00' },
  { id: 4, tipo: 'PODA', prioridad: 'MEDIA', estadoId: 1, fechaCreacion: '2026-09-29T08:00:00' },
  { id: 5, tipo: 'LIMPIEZA', prioridad: 'BAJA', estadoId: 3, fechaCreacion: '2026-09-28T08:00:00' },
]

test('solo quedan las órdenes en el estado inicial del flujo', () => {
  assert.deepEqual(ordenesPendientes(ordenes, estados).map((o) => o.id).sort(), [1, 2, 4])
})

test('ordena por prioridad y, a igual prioridad, por antigüedad', () => {
  // la urgente primero; entre las dos medias, la más vieja (4) antes que la nueva (1)
  assert.deepEqual(ordenesPendientes(ordenes, estados).map((o) => o.id), [2, 4, 1])
})

test('no cambia la lista original', () => {
  const copia = [...ordenes]
  ordenesPendientes(ordenes, estados)
  assert.deepEqual(ordenes, copia)
})

test('sin estados cargados no hay órdenes pendientes', () => {
  assert.deepEqual(ordenesPendientes(ordenes, []), [])
})

const cuadrillas = [
  { id: 1, nombre: 'Verde', tiposTrabajo: ['PODA', 'CORTE_DE_PASTO'], disponible: false },
  { id: 2, nombre: 'Azul', tiposTrabajo: ['PODA'], disponible: true },
  { id: 3, nombre: 'Alumbrado', tiposTrabajo: ['ALUMBRADO'], disponible: true },
  { id: 4, nombre: 'Amarilla', tiposTrabajo: ['PODA'], disponible: true },
  { id: 5, nombre: 'Sin datos' },
]

test('ofrece solo cuadrillas que cubren el tipo de trabajo', () => {
  const ids = cuadrillasParaOrden({ tipo: 'PODA' }, cuadrillas).map((c) => c.id)
  assert.deepEqual(ids, [4, 2, 1])
})

test('las disponibles van primero, ordenadas por nombre', () => {
  const nombres = cuadrillasParaOrden({ tipo: 'PODA' }, cuadrillas).map((c) => c.nombre)
  assert.deepEqual(nombres, ['Amarilla', 'Azul', 'Verde'])
})

test('si ninguna cubre el tipo, la lista queda vacía', () => {
  assert.deepEqual(cuadrillasParaOrden({ tipo: 'PINTURA' }, cuadrillas), [])
})
