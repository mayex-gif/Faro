import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ESTADOS_A_MANO, ESTADOS_LUMINARIA, datosDelEstado, esLuminaria, estadoAMano, estadoLuminaria, filtrarPorEstado, luminariasConEstado,
  luminariasDelEstado, pedidoParaEstado, puntoDe, resumirLuminarias, sinLuminariasVacias,
} from '../src/utils/luminarias.js'

// Solo datos en memoria: no se modifica la base.
// Un resumen como los que arma utils/mapa.js: { lugar, ordenes (las abiertas), principal }
function resumen(id, { tipo = 'LUMINARIA', estadoOperativo = true, instalada = true, ordenes = [], lng = -64.14, lat = -31.13, nombre } = {}) {
  return {
    lugar: { id, nombre: nombre ?? `Luminaria ${id}`, tipo, estadoOperativo, instalada, ubicacion: { type: 'Point', coordinates: [lng, lat] } },
    ordenes,
    principal: ordenes[0] ?? null,
  }
}
const otAbierta = { id: 50, lugarId: 1, prioridad: 'ALTA', estadoId: 1 }

test('hay cuatro estados, en el orden de la leyenda, y se buscan por clave', () => {
  assert.deepEqual(ESTADOS_LUMINARIA.map((e) => e.clave), ['funciona', 'apagada', 'arreglo', 'falta'])
  assert.equal(datosDelEstado('falta').nombre, 'A futuro')
  assert.equal(datosDelEstado('otra'), null)
})

test('solo cuentan los lugares de tipo luminaria', () => {
  assert.equal(esLuminaria({ tipo: 'LUMINARIA' }), true)
  assert.equal(esLuminaria({ tipo: 'CALLE' }), false)
  assert.equal(esLuminaria(null), false)
  const items = luminariasConEstado([resumen(1), resumen(2, { tipo: 'ESPACIO_VERDE' }), resumen(3, { tipo: 'CALLE' })])
  assert.deepEqual(items.map((i) => i.resumen.lugar.id), [1])
})

test('sinLuminariasVacias: "Todo el pueblo" sin las luminarias sin trabajos (salvo la elegida)', () => {
  const conTrabajo = resumen(1, { ordenes: [otAbierta] })
  const vacia = resumen(2)
  const apagadaSinOt = resumen(3, { estadoOperativo: false })
  const plazaVacia = resumen(4, { tipo: 'ESPACIO_VERDE' })
  const calleVacia = resumen(5, { tipo: 'CALLE' })
  // las otras clases de lugar no se tocan (las calles las saca sinCallesVacias)
  assert.deepEqual(sinLuminariasVacias([conTrabajo, vacia, apagadaSinOt, plazaVacia, calleVacia]), [conTrabajo, plazaVacia, calleVacia])
  assert.deepEqual(sinLuminariasVacias([conTrabajo, vacia, plazaVacia], 2), [conTrabajo, vacia, plazaVacia])
  assert.deepEqual(sinLuminariasVacias([]), [])
})

test('una luminaria que funciona está "funciona", aunque tenga una OT abierta (ej. mantenimiento)', () => {
  assert.equal(estadoLuminaria(resumen(1)), 'funciona')
  assert.equal(estadoLuminaria(resumen(1, { ordenes: [otAbierta] })), 'funciona')
})

test('si no funciona: "apagada" sin OT abierta, "arreglo" con OT abierta', () => {
  assert.equal(estadoLuminaria(resumen(1, { estadoOperativo: false })), 'apagada')
  assert.equal(estadoLuminaria(resumen(1, { estadoOperativo: false, ordenes: [otAbierta] })), 'arreglo')
})

test('"a futuro" gana sobre todo lo demás', () => {
  assert.equal(estadoLuminaria(resumen(1, { instalada: false, estadoOperativo: false })), 'falta')
  assert.equal(estadoLuminaria(resumen(1, { instalada: false, ordenes: [otAbierta] })), 'falta')
})

test('un lugar sin el dato instalada (undefined) cuenta como instalado', () => {
  const viejo = resumen(1)
  delete viejo.lugar.instalada
  assert.equal(estadoLuminaria(viejo), 'funciona')
})

test('el resumen cuenta cada estado y el % es sobre las instaladas', () => {
  const items = luminariasConEstado([
    resumen(1), resumen(2), resumen(3),
    resumen(4, { estadoOperativo: false }),
    resumen(5, { estadoOperativo: false, ordenes: [otAbierta] }),
    resumen(6, { instalada: false }),
  ])
  const total = resumirLuminarias(items)
  assert.equal(total.total, 6)
  assert.deepEqual(total.cuenta, { funciona: 3, apagada: 1, arreglo: 1, falta: 1 })
  assert.equal(total.porcentaje, 60) // 3 de las 5 instaladas
})

test('sin luminarias instaladas el % es null (no 0 ni NaN)', () => {
  assert.equal(resumirLuminarias([]).porcentaje, null)
  assert.equal(resumirLuminarias(luminariasConEstado([resumen(1, { instalada: false })])).porcentaje, null)
})

test('las de un estado salen ordenadas por nombre', () => {
  const items = luminariasConEstado([
    resumen(1, { estadoOperativo: false, nombre: 'Sarmiento y Córdoba' }),
    resumen(2, { estadoOperativo: false, nombre: 'Belgrano y Salta' }),
    resumen(3, { nombre: 'Alberdi' }),
  ])
  assert.deepEqual(luminariasDelEstado(items, 'apagada').map((i) => i.resumen.lugar.nombre), ['Belgrano y Salta', 'Sarmiento y Córdoba'])
})

test('el punto de un lugar: el del Point, o el centro de su caja si es otra forma', () => {
  assert.deepEqual(puntoDe({ type: 'Point', coordinates: [-64.1, -31.1] }), [-64.1, -31.1])
  assert.deepEqual(puntoDe({ type: 'LineString', coordinates: [[-64.2, -31.2], [-64.0, -31.0]] }), [-64.1, -31.1])
  assert.equal(puntoDe(null), null)
})

test('a mano se elige Funciona o Apagada; "en arreglo" sale de las OT y "a futuro" se carga así', () => {
  assert.deepEqual(ESTADOS_A_MANO, ['funciona', 'apagada'])
  assert.equal(estadoAMano({ estadoOperativo: true, instalada: true }), 'funciona')
  assert.equal(estadoAMano({ estadoOperativo: false, instalada: true }), 'apagada')
  assert.equal(estadoAMano({ estadoOperativo: false, instalada: false }), 'falta')
  assert.equal(estadoAMano({ estadoOperativo: true }), 'funciona') // sin el dato instalada
})

test('el pedido lleva el lugar entero con el estado nuevo', () => {
  const lugar = { id: 7, nombre: 'Luminaria 7', tipo: 'LUMINARIA', datosTecnicos: 'LED', estadoOperativo: true, instalada: true,
    ubicacion: { type: 'Point', coordinates: [-64.14, -31.13] } }
  assert.deepEqual(pedidoParaEstado(lugar, 'apagada'), {
    nombre: 'Luminaria 7', tipo: 'LUMINARIA', datosTecnicos: 'LED', ubicacion: lugar.ubicacion, estadoOperativo: false, instalada: true,
  })
  assert.deepEqual(pedidoParaEstado(lugar, 'falta'), { ...pedidoParaEstado(lugar, 'apagada'), instalada: false })
  assert.equal(pedidoParaEstado(lugar, 'funciona').estadoOperativo, true)
  assert.throws(() => pedidoParaEstado(lugar, 'arreglo'))
})

test('las casillas de la leyenda ocultan estados del mapa', () => {
  const items = luminariasConEstado([resumen(1), resumen(2, { estadoOperativo: false }), resumen(3, { instalada: false })])
  assert.deepEqual(filtrarPorEstado(items, { funciona: true }).map((i) => i.estado), ['apagada', 'falta'])
  assert.deepEqual(filtrarPorEstado(items, { funciona: true, falta: true }).map((i) => i.estado), ['apagada'])
  assert.equal(filtrarPorEstado(items).length, 3)
  assert.equal(filtrarPorEstado(items, { funciona: false }).length, 3)
})
