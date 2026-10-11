import test from 'node:test'
import assert from 'node:assert/strict'
import { accionesDeTarea, tareasDeCuadrilla, textoAccion } from '../src/utils/tareas.js'

// Mismo flujo que carga el backend por defecto (ids y caminos). Solo datos en memoria.
const estados = [
  { id: 1, nombre: 'Pendiente', inicial: true, cierre: false, siguientes: [2, 3, 5] },
  { id: 2, nombre: 'Planificada', inicial: false, cierre: false, siguientes: [3, 1, 5] },
  { id: 3, nombre: 'En curso', inicial: false, cierre: false, siguientes: [4, 5] },
  { id: 4, nombre: 'Finalizada', inicial: false, cierre: true, siguientes: [] },
  { id: 5, nombre: 'Cancelada', inicial: false, cierre: true, siguientes: [] },
]
const ordenes = [
  { id: 1, cuadrillaId: 7, prioridad: 'MEDIA', estadoId: 2, fechaCreacion: '2026-10-01T08:00:00' },
  { id: 2, cuadrillaId: 7, prioridad: 'URGENTE', estadoId: 3, fechaCreacion: '2026-10-02T08:00:00' },
  { id: 3, cuadrillaId: 7, prioridad: 'ALTA', estadoId: 4, fechaCreacion: '2026-09-30T08:00:00' },
  { id: 4, cuadrillaId: 8, prioridad: 'ALTA', estadoId: 3, fechaCreacion: '2026-09-29T08:00:00' },
  { id: 5, cuadrillaId: null, prioridad: 'ALTA', estadoId: 1, fechaCreacion: '2026-09-28T08:00:00' },
]

test('las tareas son las de la cuadrilla que no están cerradas, las más urgentes primero', () => {
  assert.deepEqual(tareasDeCuadrilla(ordenes, estados, 7).map((o) => o.id), [2, 1])
})

test('acepta el id de la cuadrilla como texto (así viene del desplegable)', () => {
  assert.deepEqual(tareasDeCuadrilla(ordenes, estados, '8').map((o) => o.id), [4])
})

test('sin cuadrilla elegida no hay tareas', () => {
  assert.deepEqual(tareasDeCuadrilla(ordenes, estados, ''), [])
  assert.deepEqual(tareasDeCuadrilla(ordenes, estados, null), [])
})

test('si el backend no informa la cuadrilla de las órdenes, no hay tareas', () => {
  const sinCuadrilla = ordenes.map(({ cuadrillaId, ...resto }) => resto) // eslint-disable-line no-unused-vars
  assert.deepEqual(tareasDeCuadrilla(sinCuadrilla, estados, 7), [])
})

test('una tarea planificada se inicia; la otra opción es cancelarla', () => {
  const { principal, otras } = accionesDeTarea(ordenes[0], estados)
  assert.equal(principal.nombre, 'En curso')
  assert.deepEqual(otras.map((e) => e.nombre), ['Cancelada'])
})

test('una tarea en curso se finaliza; no se ofrece volver a pendiente', () => {
  const { principal, otras } = accionesDeTarea(ordenes[1], estados)
  assert.equal(principal.nombre, 'Finalizada')
  assert.deepEqual(otras.map((e) => e.nombre), ['Cancelada'])
  const desdePlanificada = accionesDeTarea(ordenes[0], estados)
  assert.ok(![desdePlanificada.principal, ...desdePlanificada.otras].some((e) => e.inicial))
})

test('una tarea cerrada o con estado desconocido no tiene acciones', () => {
  assert.deepEqual(accionesDeTarea(ordenes[2], estados), { principal: null, otras: [] })
  assert.deepEqual(accionesDeTarea({ id: 9, estadoId: 99 }, estados), { principal: null, otras: [] })
})

test('el texto del botón sale del tipo de destino, no del nombre', () => {
  assert.equal(textoAccion(estados[2], true), 'Iniciar tarea')
  assert.equal(textoAccion(estados[3], true), 'Finalizar tarea')
  assert.equal(textoAccion(estados[4], false), 'Pasar a Cancelada')
})
