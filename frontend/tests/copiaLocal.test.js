import test from 'node:test'
import assert from 'node:assert/strict'
import { crearCopia, copiaDelUsuario, esCapatazConCuadrilla } from '../src/offline/datosLocal.js'

const usuario = { id: 4, rol: 'CAPATAZ_CUADRILLA', activo: true, cuadrillaId: 2 }
const cuadrilla = { id: 2, nombre: 'Cuadrilla Verde' }
const estados = [{ id: 1, cierre: false }, { id: 2, cierre: true }]
const ordenes = [
  { id: 1, cuadrillaId: 2, estadoId: 1, prioridad: 'MEDIA', descripcion: 'Limpiar la plaza', datoPrivado: 'no copiar' },
  { id: 2, cuadrillaId: 2, estadoId: 2, prioridad: 'ALTA' },
  { id: 3, cuadrillaId: 5, estadoId: 1, prioridad: 'ALTA' },
  { id: 4, cuadrillaId: 2, estadoId: 1, prioridad: 'URGENTE', descripcion: 'Revisar luminaria' },
]

test('la copia conserva solo tareas abiertas de la cuadrilla, en orden de prioridad', () => {
  const copia = crearCopia(usuario, cuadrilla, ordenes, estados, new Date('2026-10-20T18:00:00Z'))
  assert.deepEqual(copia.ordenes.map((orden) => orden.id), [4, 1])
  assert.equal(copia.fechaGuardado, '2026-10-20T18:00:00.000Z')
  assert.equal(copia.usuarioId, 4)
  assert.equal(copiaDelUsuario(copia, usuario), true)
  assert.equal('datoPrivado' in copia.ordenes[1], false)
  assert.equal('token' in copia, false)
  assert.equal('password' in copia, false)
  copia.ordenes[1].descripcion = 'Otro texto'
  assert.equal(ordenes[0].descripcion, 'Limpiar la plaza')
})

test('no se pueden preparar copias de otra cuadrilla ni de un usuario sin rol capataz', () => {
  assert.throws(() => crearCopia(usuario, { id: 5 }, ordenes, estados))
  for (const cuenta of [null, { ...usuario, rol: 'MESA_ENTRADAS' }, { ...usuario, activo: false }, { ...usuario, cuadrillaId: null }]) {
    assert.equal(esCapatazConCuadrilla(cuenta), false)
    assert.throws(() => crearCopia(cuenta, cuadrilla, ordenes, estados))
  }
})

test('la copia no se presenta a otro usuario ni cuando cambia su cuadrilla', () => {
  const copia = crearCopia(usuario, cuadrilla, ordenes, estados)
  assert.equal(copiaDelUsuario(copia, { ...usuario, id: 9 }), false)
  assert.equal(copiaDelUsuario(copia, { ...usuario, cuadrillaId: 8 }), false)
  assert.equal(copiaDelUsuario(copia, { ...usuario, activo: false }), false)
  assert.equal(copiaDelUsuario({ ...copia, fechaGuardado: 'rota' }, usuario), false)
  assert.equal(copiaDelUsuario({ ...copia, ordenes: [{ cuadrillaId: 9 }] }, usuario), false)
  assert.equal(copiaDelUsuario(null, usuario), false)
})

test('una cuadrilla sin trabajos puede guardar una copia vacía con fecha, sin inventar tareas', () => {
  const copia = crearCopia(usuario, cuadrilla, [], estados)
  assert.deepEqual(copia.ordenes, [])
  assert.equal(copiaDelUsuario(copia, usuario), true)
})
