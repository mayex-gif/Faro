import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COLORES_PRIORIDAD, COLOR_SIN_TRABAJOS, agruparPorLugar, cajaDe, colorDelResumen,
  geometriaEnLimites, geometriaValida, limitesDe, ordenarResumenes, ordenesAbiertas, radioDelResumen,
} from '../src/utils/mapa.js'

// Solo datos en memoria: no se modifica la base.
const estados = [
  { id: 1, nombre: 'Pendiente', inicial: true, cierre: false },
  { id: 2, nombre: 'En curso', inicial: false, cierre: false },
  { id: 3, nombre: 'Finalizada', inicial: false, cierre: true },
]
const lugares = [
  { id: 10, nombre: 'Plaza', ubicacion: { type: 'Point', coordinates: [-64.2, -31.0] } },
  { id: 11, nombre: 'Calle Sur', ubicacion: { type: 'LineString', coordinates: [[-64.21, -31.02], [-64.19, -31.03]] } },
  { id: 12, nombre: 'Luminaria 1', ubicacion: { type: 'Point', coordinates: [-64.25, -31.1] } },
]
const ordenes = [
  { id: 1, lugarId: 10, prioridad: 'MEDIA', estadoId: 1, estadoColor: '#566A73', fechaCreacion: '2026-10-01T08:00:00' },
  { id: 2, lugarId: 10, prioridad: 'URGENTE', estadoId: 2, estadoColor: '#9A4A12', fechaCreacion: '2026-10-02T08:00:00' },
  { id: 3, lugarId: 11, prioridad: 'BAJA', estadoId: 3, estadoColor: '#22633E', fechaCreacion: '2026-09-30T08:00:00' },
  { id: 4, lugarId: 11, prioridad: 'ALTA', estadoId: 1, estadoColor: '#566A73', fechaCreacion: '2026-09-29T08:00:00' },
]

test('las órdenes abiertas son las que no están en un estado de cierre', () => {
  assert.deepEqual(ordenesAbiertas(ordenes, estados).map((o) => o.id), [1, 2, 4])
})

test('agrupa por lugar y la orden principal es la más urgente', () => {
  const resumenes = agruparPorLugar(lugares, ordenesAbiertas(ordenes, estados))
  const plaza = resumenes.find((r) => r.lugar.id === 10)
  assert.deepEqual(plaza.ordenes.map((o) => o.id), [2, 1])
  assert.equal(plaza.principal.id, 2)
  // la orden 3 está finalizada: Calle Sur solo tiene la 4
  assert.deepEqual(resumenes.find((r) => r.lugar.id === 11).ordenes.map((o) => o.id), [4])
  // un lugar sin trabajos queda con principal null
  assert.equal(resumenes.find((r) => r.lugar.id === 12).principal, null)
})

test('el color sale de la prioridad o del estado, y sin trabajos es gris', () => {
  const [plaza, , luminaria] = agruparPorLugar(lugares, ordenesAbiertas(ordenes, estados))
  assert.equal(colorDelResumen(plaza, 'prioridad'), COLORES_PRIORIDAD.URGENTE)
  assert.equal(colorDelResumen(plaza, 'estado'), '#9A4A12')
  assert.equal(colorDelResumen(luminaria, 'prioridad'), COLOR_SIN_TRABAJOS)
  assert.equal(colorDelResumen(luminaria, 'estado'), COLOR_SIN_TRABAJOS)
})

test('cada prioridad tiene un color distinto y más urgente es más grande', () => {
  assert.equal(new Set(Object.values(COLORES_PRIORIDAD)).size, 4)
  const [plaza, calle, luminaria] = agruparPorLugar(lugares, ordenesAbiertas(ordenes, estados))
  assert.ok(radioDelResumen(plaza) > radioDelResumen(calle)) // urgente > alta
  assert.ok(radioDelResumen(calle) > radioDelResumen(luminaria)) // alta > sin trabajos
})

test('ordena los lugares con trabajos primero, del más urgente al menos', () => {
  const resumenes = agruparPorLugar(lugares, ordenesAbiertas(ordenes, estados))
  assert.deepEqual(ordenarResumenes(resumenes).map((r) => r.lugar.id), [10, 11, 12])
})

test('reconoce geometrías válidas e inválidas', () => {
  assert.equal(geometriaValida(lugares[0].ubicacion), true)
  assert.equal(geometriaValida(lugares[1].ubicacion), true)
  assert.equal(geometriaValida(null), false)
  assert.equal(geometriaValida({ type: 'Point', coordinates: [] }), false)
  assert.equal(geometriaValida({ type: 'Point', coordinates: ['a', 'b'] }), false)
})

test('el rectángulo de una línea abarca todos sus vértices', () => {
  assert.deepEqual(cajaDe(lugares[1].ubicacion), { sur: -31.03, oeste: -64.21, norte: -31.02, este: -64.19 })
})

test('los límites abarcan todos los lugares; sin lugares no hay límites', () => {
  assert.deepEqual(limitesDe(lugares), { sur: -31.1, oeste: -64.25, norte: -31.0, este: -64.19 })
  assert.equal(limitesDe([]), null)
})

test('un lugar cuenta como visible si su rectángulo toca la zona del mapa', () => {
  const zona = { sur: -31.04, oeste: -64.22, norte: -30.99, este: -64.18 }
  assert.equal(geometriaEnLimites(lugares[0].ubicacion, zona), true)
  assert.equal(geometriaEnLimites(lugares[1].ubicacion, zona), true)
  assert.equal(geometriaEnLimites(lugares[2].ubicacion, zona), false)
  // una calle que cruza la zona sin tener vértices adentro también se ve
  const cruza = { type: 'LineString', coordinates: [[-64.3, -31.0], [-64.1, -31.0]] }
  assert.equal(geometriaEnLimites(cruza, { sur: -31.01, oeste: -64.22, norte: -30.99, este: -64.18 }), true)
  assert.equal(geometriaEnLimites(lugares[0].ubicacion, null), false)
})
