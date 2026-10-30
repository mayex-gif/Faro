import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inicioDe, puedeAsignar, puedeCrearOrden, puedeGestionarUsuarios, puedeVer, rolConocido, tieneRol,
} from '../src/utils/permisos.js'

const encargado = { activo: true, rol: 'ENCARGADO_CORRALON' }
const mesa = { activo: true, rol: 'MESA_ENTRADAS' }
const capataz = { activo: true, rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 2 }
const vistas = ['mapa', 'ordenes', 'asignacion', 'infraestructura', 'ficha', 'tareas', 'usuarios']

test('el encargado ve todas las pantallas y puede crear órdenes y asignar cuadrillas', () => {
  assert.equal(vistas.every((vista) => puedeVer(encargado, vista)), true)
  assert.equal(puedeCrearOrden(encargado), true)
  assert.equal(puedeAsignar(encargado), true)
  assert.equal(inicioDe(encargado), 'mapa')
})

test('mesa puede cargar órdenes y consultar el mapa y la historia, sin administrar cuadrillas', () => {
  assert.deepEqual(vistas.filter((vista) => puedeVer(mesa, vista)), ['mapa', 'ordenes', 'ficha', 'usuarios'])
  assert.equal(puedeCrearOrden(mesa), true)
  assert.equal(puedeAsignar(mesa), false)
})

test('el capataz empieza en Mis tareas y no tiene acceso a carga o asignación de órdenes', () => {
  assert.equal(inicioDe(capataz), 'tareas')
  assert.deepEqual(vistas.filter((vista) => puedeVer(capataz, vista)), ['mapa', 'ficha', 'tareas'])
  assert.equal(puedeCrearOrden(capataz), false)
  assert.equal(puedeAsignar(capataz), false)
})

test('no se conceden vistas a cuentas inactivas, desconocidas ni ausentes', () => {
  for (const usuario of [null, {}, { ...encargado, activo: false }, { activo: true, rol: 'OTRO' }, { activo: true, rol: 'toString' }]) {
    assert.equal(vistas.some((vista) => puedeVer(usuario, vista)), false)
    assert.equal(puedeCrearOrden(usuario), false)
    assert.equal(puedeAsignar(usuario), false)
    assert.equal(puedeGestionarUsuarios(usuario), false)
  }
  assert.equal(tieneRol(mesa, 'ENCARGADO_CORRALON', 'MESA_ENTRADAS'), true)
  assert.equal(rolConocido('CAPATAZ_CUADRILLA'), true)
  assert.equal(rolConocido('toString'), false)
})

test('gestionan usuarios el encargado y mesa de entradas; el capataz no', () => {
  assert.equal(puedeGestionarUsuarios(encargado), true)
  assert.equal(puedeGestionarUsuarios(mesa), true)
  assert.equal(puedeGestionarUsuarios(capataz), false)
  assert.equal(puedeVer(capataz, 'usuarios'), false)
})
