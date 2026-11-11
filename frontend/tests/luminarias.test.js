import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ESTADOS_LUMINARIA, datosDelEstado, esLuminaria, estadoLuminaria, luminariaEnZona, luminariasConEstado,
  luminariasDelEstado, puntoDe, resumirLuminarias, textoDeZona, zonasDeLuminarias,
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
  assert.equal(datosDelEstado('falta').plural, 'Faltan poner')
  assert.equal(datosDelEstado('otra'), null)
})

test('solo cuentan los lugares de tipo luminaria', () => {
  assert.equal(esLuminaria({ tipo: 'LUMINARIA' }), true)
  assert.equal(esLuminaria({ tipo: 'CALLE' }), false)
  assert.equal(esLuminaria(null), false)
  const items = luminariasConEstado([resumen(1), resumen(2, { tipo: 'ESPACIO_VERDE' }), resumen(3, { tipo: 'CALLE' })])
  assert.deepEqual(items.map((i) => i.resumen.lugar.id), [1])
})

test('una luminaria que funciona está "funciona", aunque tenga una OT abierta (ej. mantenimiento)', () => {
  assert.equal(estadoLuminaria(resumen(1)), 'funciona')
  assert.equal(estadoLuminaria(resumen(1, { ordenes: [otAbierta] })), 'funciona')
})

test('si no funciona: "apagada" sin OT abierta, "arreglo" con OT abierta', () => {
  assert.equal(estadoLuminaria(resumen(1, { estadoOperativo: false })), 'apagada')
  assert.equal(estadoLuminaria(resumen(1, { estadoOperativo: false, ordenes: [otAbierta] })), 'arreglo')
})

test('"falta poner" gana sobre todo lo demás (aunque tenga la OT de instalación abierta)', () => {
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

// Cuatro luminarias en las esquinas de un cuadrado y una más: el centro queda en (-64.14, -31.13)
const esquinas = () => luminariasConEstado([
  resumen(1, { lng: -64.16, lat: -31.11 }), // noroeste, funciona
  resumen(2, { lng: -64.12, lat: -31.11, estadoOperativo: false }), // noreste, apagada
  resumen(3, { lng: -64.16, lat: -31.15 }), // suroeste, funciona
  resumen(4, { lng: -64.12, lat: -31.15, estadoOperativo: false, ordenes: [otAbierta] }), // sureste, en arreglo
  resumen(5, { lng: -64.13, lat: -31.12 }), // noreste, funciona
])

test('las zonas parten el pueblo en 4 y salen primero las que tienen menos luz', () => {
  const zonas = zonasDeLuminarias(esquinas())
  assert.deepEqual(zonas.map((z) => [z.nombre, z.porcentaje]), [
    ['Sureste', 0], ['Noreste', 50], ['Noroeste', 100], ['Suroeste', 100],
  ])
  const noreste = zonas.find((z) => z.clave === 'noreste')
  assert.deepEqual(noreste.cuenta, { funciona: 1, apagada: 1, arreglo: 0, falta: 0 })
  assert.deepEqual(noreste.limites, { sur: -31.13, norte: -31.11, oeste: -64.14, este: -64.12 })
})

test('una zona donde solo hay luminarias que faltan poner no aparece', () => {
  const items = esquinas().filter((i) => i.resumen.lugar.id !== 2 && i.resumen.lugar.id !== 5)
  items.push(...luminariasConEstado([resumen(9, { lng: -64.12, lat: -31.11, instalada: false })]))
  assert.equal(zonasDeLuminarias(items).some((z) => z.clave === 'noreste'), false)
  assert.deepEqual(zonasDeLuminarias([]), [])
})

test('se puede saber si una luminaria cae en una zona', () => {
  const items = esquinas()
  const noreste = zonasDeLuminarias(items).find((z) => z.clave === 'noreste')
  assert.deepEqual(items.filter((i) => luminariaEnZona(i, noreste)).map((i) => i.resumen.lugar.id), [2, 5])
  assert.equal(luminariaEnZona(items[0], null), false)
})

test('el texto de la zona dice cuántas apagadas y, si hay, cuántas en arreglo', () => {
  assert.equal(textoDeZona({ cuenta: { apagada: 1, arreglo: 0 } }), '1 apagada')
  assert.equal(textoDeZona({ cuenta: { apagada: 0, arreglo: 2 } }), '0 apagadas · 2 en arreglo')
})
