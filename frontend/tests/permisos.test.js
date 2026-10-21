import test from 'node:test'
import assert from 'node:assert/strict'
import { ROLES } from '../src/utils/auth.js'
import { inicioPara, masPara, puedeVer, seccionesPara } from '../src/utils/navegacion.js'

test('el encargado del corralón ve todas las pantallas', () => {
  for (const clave of ['mapa', 'ordenes', 'asignacion', 'infraestructura', 'tareas', 'ficha']) {
    assert.equal(puedeVer(ROLES.ENCARGADO_CORRALON, clave), true, clave)
  }
})

test('mesa de entradas ve Órdenes y Mapa, pero no Infraestructura ni Asignación', () => {
  assert.equal(puedeVer(ROLES.MESA_ENTRADAS, 'ordenes'), true)
  assert.equal(puedeVer(ROLES.MESA_ENTRADAS, 'mapa'), true)
  assert.equal(puedeVer(ROLES.MESA_ENTRADAS, 'infraestructura'), false)
  assert.equal(puedeVer(ROLES.MESA_ENTRADAS, 'asignacion'), false)
})

test('el capataz solo ve Mis tareas y el Mapa (y la ficha, que no tiene restricción)', () => {
  assert.equal(puedeVer(ROLES.CAPATAZ_CUADRILLA, 'tareas'), true)
  assert.equal(puedeVer(ROLES.CAPATAZ_CUADRILLA, 'mapa'), true)
  assert.equal(puedeVer(ROLES.CAPATAZ_CUADRILLA, 'ficha'), true)
  assert.equal(puedeVer(ROLES.CAPATAZ_CUADRILLA, 'ordenes'), false)
  assert.equal(puedeVer(ROLES.CAPATAZ_CUADRILLA, 'asignacion'), false)
  assert.equal(puedeVer(ROLES.CAPATAZ_CUADRILLA, 'infraestructura'), false)
})

test('sin rol (todavía sin sesión) no se puede ver ninguna pantalla', () => {
  assert.equal(puedeVer(null, 'mapa'), false)
  assert.equal(puedeVer(undefined, 'ordenes'), false)
})

test('seccionesPara filtra la barra de secciones según el rol', () => {
  assert.deepEqual(seccionesPara(ROLES.ENCARGADO_CORRALON).map((s) => s.clave), ['mapa', 'ordenes', 'asignacion'])
  assert.deepEqual(seccionesPara(ROLES.MESA_ENTRADAS).map((s) => s.clave), ['mapa', 'ordenes'])
  assert.deepEqual(seccionesPara(ROLES.CAPATAZ_CUADRILLA).map((s) => s.clave), ['mapa'])
})

test('masPara filtra el menú "Más" según el rol', () => {
  assert.deepEqual(masPara(ROLES.ENCARGADO_CORRALON).map((s) => s.clave), ['infraestructura', 'tareas'])
  assert.deepEqual(masPara(ROLES.MESA_ENTRADAS).map((s) => s.clave), [])
  assert.deepEqual(masPara(ROLES.CAPATAZ_CUADRILLA).map((s) => s.clave), ['tareas'])
})

test('inicioPara manda al capataz directo a Mis tareas; el resto arranca en el mapa', () => {
  assert.equal(inicioPara(ROLES.CAPATAZ_CUADRILLA), 'tareas')
  assert.equal(inicioPara(ROLES.ENCARGADO_CORRALON), 'mapa')
  assert.equal(inicioPara(ROLES.MESA_ENTRADAS), 'mapa')
})
