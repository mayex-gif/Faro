import test from 'node:test'
import assert from 'node:assert/strict'
import { ROLES, estaAutenticado, nombreRol, tieneRol } from '../src/utils/auth.js'

const encargado = { id: 1, nombre: 'Martín', rol: ROLES.ENCARGADO_CORRALON }
const capataz = { id: 2, nombre: 'Carlos', rol: ROLES.CAPATAZ_CUADRILLA, cuadrillaId: 1 }

test('estaAutenticado exige token y usuario a la vez', () => {
  assert.equal(estaAutenticado('un-token', encargado), true)
  assert.equal(estaAutenticado(null, encargado), false)
  assert.equal(estaAutenticado('un-token', null), false)
  assert.equal(estaAutenticado(null, null), false)
})

test('tieneRol reconoce el rol del usuario entre los permitidos', () => {
  assert.equal(tieneRol(encargado, ROLES.ENCARGADO_CORRALON), true)
  assert.equal(tieneRol(capataz, ROLES.ENCARGADO_CORRALON), false)
  assert.equal(tieneRol(capataz, ROLES.ENCARGADO_CORRALON, ROLES.CAPATAZ_CUADRILLA), true)
})

test('tieneRol sin usuario (todavía no hay sesión) no cumple ningún rol', () => {
  assert.equal(tieneRol(null, ROLES.ENCARGADO_CORRALON), false)
  assert.equal(tieneRol(undefined, ROLES.MESA_ENTRADAS), false)
})

test('nombreRol traduce el valor del backend a un texto para mostrar', () => {
  assert.equal(nombreRol(ROLES.CAPATAZ_CUADRILLA), 'Capataz de cuadrilla')
  assert.equal(nombreRol('ROL_DESCONOCIDO'), 'ROL_DESCONOCIDO')
})
