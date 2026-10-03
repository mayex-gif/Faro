import test from 'node:test'
import assert from 'node:assert/strict'
import { FILTROS_VACIOS, filtrarPuntos } from '../src/utils/filtros.js'

const puntos = [
  { id: 1, nombre: 'Plaza San Martín', datosTecnicos: 'Sector juegos', tipo: 'ESPACIO_VERDE', estadoOperativo: true },
  { id: 2, nombre: 'Luz del centro', datosTecnicos: 'LED 100W', tipo: 'LUMINARIA', estadoOperativo: false },
  { id: 3, nombre: 'Calle principal', datosTecnicos: '', tipo: 'CALLE', estadoOperativo: true },
]

test('lugares: sin filtros conserva el listado', () => {
  assert.deepEqual(filtrarPuntos(puntos, FILTROS_VACIOS), puntos)
})

test('lugares: texto ignora tildes y mayúsculas y consulta datos técnicos', () => {
  assert.equal(filtrarPuntos(puntos, { ...FILTROS_VACIOS, texto: 'san martin' })[0].id, 1)
  assert.equal(filtrarPuntos(puntos, { ...FILTROS_VACIOS, texto: 'led' })[0].id, 2)
})

test('lugares: combina tipo y estado operativo', () => {
  assert.deepEqual(filtrarPuntos(puntos, { texto: '', tipo: 'LUMINARIA', estado: 'falla' }).map((p) => p.id), [2])
  assert.deepEqual(filtrarPuntos(puntos, { texto: '', tipo: 'LUMINARIA', estado: 'funciona' }), [])
})

test('lugares: sin coincidencias y sin registros devuelve lista vacía', () => {
  assert.deepEqual(filtrarPuntos(puntos, { ...FILTROS_VACIOS, texto: 'inexistente' }), [])
  assert.deepEqual(filtrarPuntos([], FILTROS_VACIOS), [])
})
