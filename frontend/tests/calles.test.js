import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buscarCalles, callesDe, conTramos, esCalle, resumirCalles, sinCallesVacias, textoDeLaCalle, tramoDeLaOrden, ubicacionDeLaOrden,
} from '../src/utils/calles.js'
import { cortar, crucesDe, distanciasDelTramo } from '../src/utils/tramos.js'

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

// ===== Tramos de las OT abiertas (paso 5 de tramos de calle) =====
// Barrio inventado en metros: Buenos Aires de x=0 a x=400, cruzada por Catamarca (100), La Rioja (200) y Jujuy (300).
const LAT0 = -31.134
const M = 6371000 * Math.PI / 180
const g = (x, y) => [-64.14 + x / (M * Math.cos(LAT0 * Math.PI / 180)), LAT0 + y / M]
const linea = (id, nombre, ...puntos) => ({ id, nombre, tipo: 'CALLE', ubicacion: { type: 'LineString', coordinates: puntos.map(([x, y]) => g(x, y)) } })
const buenosAires = linea(1, 'Buenos Aires', [0, 0], [400, 0])
const callesDelBarrio = [buenosAires, linea(2, 'Catamarca', [100, 100], [100, -100]), linea(3, 'La Rioja', [200, 100], [200, -100]),
  linea(4, 'Jujuy', [300, 100], [300, -100])]
const esquinas = crucesDe(buenosAires, callesDelBarrio)
const ot = (id, prioridad, extra = {}) => ({ id, tipo: 'BACHEO', prioridad, lugarId: 1, ...extra })

test('tramoDeLaOrden: el guardado; si es vieja con "entre calles", se calcula; por altura o sin datos, toda la calle', () => {
  const guardado = cortar(buenosAires, 150, 250)
  assert.equal(tramoDeLaOrden(ot(1, 'ALTA', { tramo: guardado }), buenosAires, esquinas), guardado)
  const calculado = tramoDeLaOrden(ot(2, 'ALTA', { calleEntre1: 'Catamarca', calleEntre2: 'Jujuy' }), buenosAires, esquinas)
  const { desde, hasta } = distanciasDelTramo(buenosAires, calculado)
  assert.ok(Math.abs(desde - 100) < 1 && Math.abs(hasta - 300) < 1)
  assert.equal(tramoDeLaOrden(ot(3, 'ALTA', { altura: '350' }), buenosAires, esquinas), null)
  assert.equal(tramoDeLaOrden(ot(4, 'ALTA'), buenosAires, esquinas), null)
})

test('ubicacionDeLaOrden: el texto para la ficha, sin repetir el nombre de la calle', () => {
  assert.equal(ubicacionDeLaOrden(ot(1, 'ALTA', { tramo: cortar(buenosAires, 100, 200) }), buenosAires, esquinas), 'Entre Catamarca y La Rioja')
  assert.equal(ubicacionDeLaOrden(ot(2, 'ALTA', { tramo: cortar(buenosAires, 150, 300) }), buenosAires, esquinas),
    'Desde mitad de cuadra (entre Catamarca y La Rioja) hasta Jujuy')
  assert.equal(ubicacionDeLaOrden(ot(3, 'ALTA', { altura: '350' }), buenosAires, esquinas), 'Altura 350')
  assert.equal(ubicacionDeLaOrden(ot(4, 'ALTA'), buenosAires, esquinas), 'Toda la calle')
  // calles viejas que ya no se cruzan: se muestran tal cual
  assert.equal(ubicacionDeLaOrden(ot(5, 'ALTA', { calleEntre1: 'Vieja', calleEntre2: 'Otra' }), buenosAires, esquinas), 'Entre Vieja y Otra')
})

test('conTramos: cada OT abierta de una calle trae su tramo y su texto, en el orden de urgencia', () => {
  const urgente = ot(10, 'URGENTE', { tramo: cortar(buenosAires, 100, 200) })
  const baja = ot(11, 'BAJA')
  const plaza = { lugar: { id: 9, nombre: 'Plaza', tipo: 'ESPACIO_VERDE' }, ordenes: [ot(12, 'ALTA')], principal: null }
  const vacia = { lugar: callesDelBarrio[1], ordenes: [], principal: null }
  const [calle, otraPlaza, sinTrabajos] = conTramos([{ lugar: buenosAires, ordenes: [urgente, baja], principal: urgente }, plaza, vacia], callesDelBarrio)
  assert.deepEqual(calle.tramos.map((t) => [t.orden.id, t.texto, t.geometria?.type ?? null]),
    [[10, 'Entre Catamarca y La Rioja', 'LineString'], [11, 'Toda la calle', null]])
  assert.equal(otraPlaza, plaza) // los lugares que no son calles quedan igual
  assert.equal(sinTrabajos.tramos, undefined)
  assert.equal(textoDeLaCalle(calle), 'OT #10 · Bacheo · Urgente · entre Catamarca y La Rioja · 2 trabajos abiertos')
})

test('sinCallesVacias: "Todo el pueblo" sin las calles sin trabajos (salvo la elegida)', () => {
  const conTrabajo = { lugar: buenosAires, ordenes: [ot(1, 'ALTA')], principal: ot(1, 'ALTA') }
  const vacia = { lugar: callesDelBarrio[1], ordenes: [], principal: null }
  const plazaVacia = { lugar: { id: 9, nombre: 'Plaza', tipo: 'ESPACIO_VERDE' }, ordenes: [], principal: null }
  assert.deepEqual(sinCallesVacias([conTrabajo, vacia, plazaVacia]), [conTrabajo, plazaVacia])
  assert.deepEqual(sinCallesVacias([conTrabajo, vacia, plazaVacia], 2), [conTrabajo, vacia, plazaVacia])
})
