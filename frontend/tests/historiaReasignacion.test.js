import test from 'node:test'
import assert from 'node:assert/strict'
import { detalleEvento, tituloEvento } from '../src/utils/historia.js'

// Un evento de reasignación, con la misma forma que devuelve GET /api/infraestructura/{id}/historia
const reasignada = {
  fecha: '2026-10-11T13:05:00', tipo: 'CUADRILLA_REASIGNADA', ordenId: 7, ordenDescripcion: 'Limpiar el parque',
  tipoTrabajo: 'LIMPIEZA', origen: null, prioridad: null,
  estadoAnterior: 'En curso', estadoNuevo: 'En curso', estadoNuevoColor: '#9A4A12', cierre: false,
  cuadrilla: 'Cuadrilla Servicios Generales', cuadrillaAnterior: 'Cuadrilla Verde',
}

test('la reasignación se titula con la cuadrilla nueva', () => {
  assert.equal(tituloEvento(reasignada), 'Se reasignó a Cuadrilla Servicios Generales')
})

test('el detalle de la reasignación dice qué cuadrilla la tenía antes, no el estado', () => {
  assert.equal(detalleEvento(reasignada), 'Antes la tenía Cuadrilla Verde')
})

test('si no viene la cuadrilla anterior, la reasignación no muestra detalle', () => {
  assert.equal(detalleEvento({ ...reasignada, cuadrillaAnterior: null }), '')
})