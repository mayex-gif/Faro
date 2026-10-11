import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarPorVista, VISTAS_HISTORIA } from '../src/utils/historia.js'

// La OT 1 se finalizó; la OT 2 sigue en curso. Del más nuevo al más viejo, como los manda el backend.
const eventos = [
  { fecha: '2026-10-08T10:00:00', tipo: 'CAMBIO_ESTADO', ordenId: 1, estadoNuevo: 'Finalizada', cierre: true },
  { fecha: '2026-10-07T09:00:00', tipo: 'CUADRILLA_ASIGNADA', ordenId: 2, estadoNuevo: 'En curso', cierre: false },
  { fecha: '2026-10-06T09:00:00', tipo: 'ORDEN_CREADA', ordenId: 2, cierre: false },
  { fecha: '2026-10-05T09:00:00', tipo: 'CUADRILLA_ASIGNADA', ordenId: 1, estadoNuevo: 'En curso', cierre: false },
  { fecha: '2026-10-04T09:00:00', tipo: 'ORDEN_CREADA', ordenId: 1, cierre: false },
]

test('"todas" muestra todos los eventos sin cambiar el orden', () => {
  assert.deepEqual(filtrarPorVista(eventos, 'todas'), eventos)
})

test('"abiertas" muestra solo los eventos de las órdenes que no se cerraron', () => {
  assert.deepEqual(filtrarPorVista(eventos, 'abiertas').map((e) => e.ordenId), [2, 2])
})

test('"cerradas" muestra todos los eventos de las órdenes cerradas, también los anteriores al cierre', () => {
  assert.deepEqual(filtrarPorVista(eventos, 'cerradas').map((e) => e.fecha.slice(8, 10)), ['08', '05', '04'])
})

test('sin eventos, cualquier vista devuelve una lista vacía', () => {
  assert.deepEqual(filtrarPorVista([], 'cerradas'), [])
})

test('las opciones de la vista son Todos, Abiertos y Cerrados', () => {
  assert.deepEqual(VISTAS_HISTORIA.map((v) => v.etiqueta), ['Todos', 'Abiertos', 'Cerrados'])
})
