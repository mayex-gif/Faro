import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ANTIGUEDADES, antiguedadesParaFiltro, contarPorAntiguedad, filtrarPorAntiguedad, filtrarPorEstado, luminariasConEstado, FALTA_ANTIGUEDAD, antiguedadLuminaria, antiguedadParaGuardar, datosDeAntiguedad, faltaAntiguedad,
  nombreConArticulo, pedidoParaAntiguedad, pedidoParaEstado, preguntaAntiguedad, preguntaCambioAntiguedad, textoDelError,
} from '../src/utils/luminarias.js'

// Nueva o vieja de las luminarias (paso 2). Solo datos en memoria: no se toca la base.
function luminaria(cambios = {}) {
  return {
    id: 7, nombre: 'Luminaria San Martín y Belgrano', tipo: 'LUMINARIA', datosTecnicos: 'LED 60 W',
    estadoOperativo: true, instalada: true, nueva: null, ubicacion: { type: 'Point', coordinates: [-64.14, -31.13] },
    ...cambios,
  }
}

test('hay tres antigüedades: nueva, vieja y sin marcar (con su color de cabezal)', () => {
  assert.deepEqual(ANTIGUEDADES.map((a) => a.clave), ['nueva', 'vieja', 'sinMarcar'])
  assert.equal(datosDeAntiguedad('vieja').plural, 'Viejas')
  assert.ok(datosDeAntiguedad('nueva').luz)
  assert.equal(datosDeAntiguedad('otra'), null)
})

test('la antigüedad sale del campo "nueva" del backend', () => {
  assert.equal(antiguedadLuminaria(luminaria({ nueva: true })), 'nueva')
  assert.equal(antiguedadLuminaria(luminaria({ nueva: false })), 'vieja')
  assert.equal(antiguedadLuminaria(luminaria({ nueva: null })), 'sinMarcar')
  assert.equal(antiguedadLuminaria(luminaria({ nueva: undefined })), 'sinMarcar') // backend viejo, sin el campo
})

test('las luminarias a futuro y los otros lugares no tienen antigüedad', () => {
  assert.equal(antiguedadLuminaria(luminaria({ instalada: false })), null)
  assert.equal(antiguedadLuminaria({ tipo: 'CALLE', nombre: 'San Martín' }), null)
  assert.equal(antiguedadLuminaria(null), null)
})

test('"¿Es nueva o vieja?" se pregunta solo para luminarias puestas, y al agregar es obligatoria', () => {
  assert.equal(preguntaAntiguedad({ tipo: 'LUMINARIA', instalada: true }), true)
  assert.equal(preguntaAntiguedad({ tipo: 'LUMINARIA', instalada: false }), false)
  assert.equal(preguntaAntiguedad({ tipo: 'CALLE', instalada: true }), false)
  assert.equal(faltaAntiguedad({ tipo: 'LUMINARIA', instalada: true, nueva: null }), true)
  assert.equal(faltaAntiguedad({ tipo: 'LUMINARIA', instalada: true, nueva: false }), false)
  assert.equal(faltaAntiguedad({ tipo: 'LUMINARIA', instalada: false, nueva: null }), false) // a futuro: no se pregunta
  assert.equal(faltaAntiguedad({ tipo: 'ESPACIO_VERDE', instalada: true }), false)
  assert.match(FALTA_ANTIGUEDAD, /nueva o vieja/)
})

test('al guardar el formulario, "nueva" va solo si es una luminaria puesta y se eligió algo', () => {
  assert.deepEqual(antiguedadParaGuardar({ tipo: 'LUMINARIA', instalada: true, nueva: true }), { nueva: true })
  assert.deepEqual(antiguedadParaGuardar({ tipo: 'LUMINARIA', instalada: true, nueva: false }), { nueva: false })
  assert.deepEqual(antiguedadParaGuardar({ tipo: 'LUMINARIA', instalada: true, nueva: null }), {})
  assert.deepEqual(antiguedadParaGuardar({ tipo: 'LUMINARIA', instalada: false, nueva: true }), {}) // el backend daría 400
  assert.deepEqual(antiguedadParaGuardar({ tipo: 'CALLE', instalada: true, nueva: true }), {})
})

test('el pedido para cambiarla lleva el lugar entero y no toca si funciona', () => {
  const apagada = luminaria({ estadoOperativo: false, nueva: true })
  assert.deepEqual(pedidoParaAntiguedad(apagada, false), {
    nombre: 'Luminaria San Martín y Belgrano', tipo: 'LUMINARIA', datosTecnicos: 'LED 60 W',
    ubicacion: apagada.ubicacion, estadoOperativo: false, instalada: true, nueva: false,
  })
})

test('cambiar el estado (Funciona / Apagada) no manda "nueva": el backend la deja como estaba', () => {
  assert.equal('nueva' in pedidoParaEstado(luminaria({ nueva: false }), 'apagada'), false)
})

test('la pregunta del pop-up de confirmación nombra la luminaria', () => {
  assert.equal(preguntaCambioAntiguedad(luminaria(), false), '¿Marcar la Luminaria San Martín y Belgrano como vieja?')
  assert.equal(preguntaCambioAntiguedad(luminaria(), true), '¿Marcar la Luminaria San Martín y Belgrano como nueva?')
  assert.equal(nombreConArticulo(luminaria({ nombre: 'Poste 12' })), 'la luminaria “Poste 12”')
})

test('si no hay señal el error sale en castellano; si respondió el backend, se muestra su mensaje', () => {
  assert.match(textoDelError(new TypeError('Failed to fetch')), /revisá la conexión/)
  assert.equal(textoDelError({ estado: 403, message: 'No tenés permiso.' }), 'No tenés permiso.')
  assert.equal(textoDelError(undefined, 'Otro texto'), 'Otro texto')
})

// ---------- Paso 3: el mapa (postes y casillas "Nuevas / Viejas") ----------
function resumen(id, cambios = {}) {
  return { lugar: luminaria({ id, nombre: `Luminaria ${id}`, ...cambios }), ordenes: [], principal: null }
}
const pueblo = [
  resumen(1, { nueva: true }), resumen(2, { nueva: true }), resumen(3, { nueva: false }),
  resumen(4, { nueva: false, estadoOperativo: false }), resumen(5, { nueva: null }),
  resumen(6, { instalada: false, estadoOperativo: false }), // a futuro
]

test('cada luminaria del mapa trae si es nueva o vieja (las a futuro, null)', () => {
  const items = luminariasConEstado(pueblo)
  assert.deepEqual(items.map((i) => i.antiguedad), ['nueva', 'nueva', 'vieja', 'vieja', 'sinMarcar', null])
})

test('se cuentan las instaladas por nueva / vieja / sin marcar', () => {
  assert.deepEqual(contarPorAntiguedad(luminariasConEstado(pueblo)), { nueva: 2, vieja: 2, sinMarcar: 1 })
})

test('la casilla "Sin marcar" aparece solo si hay alguna', () => {
  assert.deepEqual(antiguedadesParaFiltro({ nueva: 2, vieja: 1, sinMarcar: 0 }).map((a) => a.clave), ['nueva', 'vieja'])
  assert.deepEqual(antiguedadesParaFiltro({ nueva: 0, vieja: 0, sinMarcar: 3 }).map((a) => a.clave), ['nueva', 'vieja', 'sinMarcar'])
})

test('destildar "Viejas" las saca del mapa; las a futuro no se tocan', () => {
  const items = luminariasConEstado(pueblo)
  assert.deepEqual(filtrarPorAntiguedad(items, { vieja: true }).map((i) => i.resumen.lugar.id), [1, 2, 5, 6])
  assert.equal(filtrarPorAntiguedad(items, {}).length, 6)
})

test('las dos filas de casillas se combinan: solo las apagadas que son viejas', () => {
  const items = luminariasConEstado(pueblo)
  const soloApagadas = filtrarPorEstado(items, { funciona: true, arreglo: true, falta: true })
  assert.deepEqual(filtrarPorAntiguedad(soloApagadas, { nueva: true, sinMarcar: true }).map((i) => i.resumen.lugar.id), [4])
})
