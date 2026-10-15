import test from 'node:test'
import assert from 'node:assert/strict'
import { esperaCuadrilla } from '../src/utils/asignacion.js'

const estados = [
  { id: 1, nombre: 'Pendiente', inicial: true, cierre: false },
  { id: 2, nombre: 'En curso', inicial: false, cierre: false },
]

test('una OT en el estado inicial y sin cuadrilla espera que le asignen una', () => {
  assert.equal(esperaCuadrilla({ estadoId: 1, cuadrillaId: null }, estados), true)
})

test('si ya tiene cuadrilla, no espera (eso es reasignar, en la pantalla Cuadrillas)', () => {
  assert.equal(esperaCuadrilla({ estadoId: 1, cuadrillaId: 4 }, estados), false)
})

test('si ya no está en el estado inicial, no espera cuadrilla', () => {
  assert.equal(esperaCuadrilla({ estadoId: 2, cuadrillaId: null }, estados), false)
})

test('sin estados cargados, no ofrece asignar', () => {
  assert.equal(esperaCuadrilla({ estadoId: 1, cuadrillaId: null }, []), false)
})
