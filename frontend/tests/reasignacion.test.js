import test from 'node:test'
import assert from 'node:assert/strict'
import { cuadrillasParaReasignar, ordenesAsignadas } from '../src/utils/asignacion.js'

// Solo datos en memoria: no se modifica la base.
const estados = [
  { id: 1, nombre: 'Pendiente', inicial: true, cierre: false },
  { id: 3, nombre: 'En curso', inicial: false, cierre: false },
  { id: 4, nombre: 'Finalizada', inicial: false, cierre: true },
  { id: 5, nombre: 'Cancelada', inicial: false, cierre: true },
]
const ordenes = [
  { id: 1, tipo: 'PODA', prioridad: 'BAJA', estadoId: 3, cuadrillaId: null, fechaCreacion: '2026-10-01T08:00:00' },
  { id: 2, tipo: 'LIMPIEZA', prioridad: 'MEDIA', estadoId: 3, cuadrillaId: 1, fechaCreacion: '2026-10-05T08:00:00' },
  { id: 3, tipo: 'PODA', prioridad: 'URGENTE', estadoId: 3, cuadrillaId: 1, fechaCreacion: '2026-10-06T08:00:00' },
  { id: 4, tipo: 'LIMPIEZA', prioridad: 'MEDIA', estadoId: 3, cuadrillaId: 4, fechaCreacion: '2026-10-02T08:00:00' },
  { id: 5, tipo: 'LIMPIEZA', prioridad: 'ALTA', estadoId: 4, cuadrillaId: 4, fechaCreacion: '2026-10-03T08:00:00' },
  { id: 6, tipo: 'PODA', prioridad: 'ALTA', estadoId: 5, cuadrillaId: 1, fechaCreacion: '2026-10-04T08:00:00' },
  { id: 7, tipo: 'PODA', prioridad: 'ALTA', estadoId: 1, cuadrillaId: null, fechaCreacion: '2026-10-07T08:00:00' },
]

test('solo quedan las órdenes que tienen cuadrilla y no están cerradas', () => {
  // 1 y 7 no tienen cuadrilla; 5 está finalizada y 6 cancelada
  assert.deepEqual(ordenesAsignadas(ordenes, estados).map((o) => o.id).sort(), [2, 3, 4])
})

test('las asignadas se ordenan por prioridad y, a igual prioridad, por antigüedad', () => {
  // la urgente primero; entre las dos medias, la más vieja (4) antes que la nueva (2)
  assert.deepEqual(ordenesAsignadas(ordenes, estados).map((o) => o.id), [3, 4, 2])
})

test('no cambia la lista original de órdenes', () => {
  const copia = [...ordenes]
  ordenesAsignadas(ordenes, estados)
  assert.deepEqual(ordenes, copia)
})

test('sin estados cargados no hay órdenes para reasignar', () => {
  assert.deepEqual(ordenesAsignadas(ordenes, []), [])
})

const cuadrillas = [
  { id: 1, nombre: 'Cuadrilla Verde', tiposTrabajo: ['PODA', 'CORTE_DE_PASTO', 'LIMPIEZA'], disponible: true },
  { id: 2, nombre: 'Cuadrilla Alumbrado', tiposTrabajo: ['ALUMBRADO'], disponible: true },
  { id: 4, nombre: 'Cuadrilla Servicios Generales', tiposTrabajo: ['OTRO', 'LIMPIEZA'], disponible: true },
  { id: 5, nombre: 'Cuadrilla Barrido', tiposTrabajo: ['LIMPIEZA'], disponible: false },
]

test('para reasignar se ofrecen las que hacen ese trabajo, sin la cuadrilla actual', () => {
  const orden = { id: 2, tipo: 'LIMPIEZA', cuadrillaId: 1 }
  // la disponible primero; la que está fuera de servicio queda al final (la pantalla la muestra deshabilitada)
  assert.deepEqual(cuadrillasParaReasignar(orden, cuadrillas).map((c) => c.id), [4, 5])
})

test('si solo una cuadrilla hace ese trabajo y ya la tiene, no hay a quién reasignar', () => {
  const orden = { id: 9, tipo: 'ALUMBRADO', cuadrillaId: 2 }
  assert.deepEqual(cuadrillasParaReasignar(orden, cuadrillas), [])
})

test('compara el id de la cuadrilla aunque venga como texto', () => {
  const orden = { id: 2, tipo: 'LIMPIEZA', cuadrillaId: '1' }
  assert.deepEqual(cuadrillasParaReasignar(orden, cuadrillas).map((c) => c.id), [4, 5])
})