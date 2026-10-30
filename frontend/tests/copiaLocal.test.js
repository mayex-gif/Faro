import test from 'node:test'
import assert from 'node:assert/strict'
import { actualizarCopia, crearCopia, copiaDelUsuario, esCapatazConCuadrilla } from '../src/offline/datosLocal.js'

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

// ===================== Versión 2: con estados, para iniciar y finalizar sin señal =====================

const flujo = [
  { id: 1, nombre: 'Planificada', color: '#1D4E89', inicial: false, cierre: false, siguientes: [3, 2], posicion: 9 },
  { id: 3, nombre: 'En curso', color: '#9A4A12', cierre: false, siguientes: [2] },
  { id: 2, nombre: 'Finalizada', color: '#2E7D32', cierre: true, siguientes: [] },
]

test('la copia guarda los estados y sus caminos (sin datos de más)', () => {
  const copia = crearCopia(usuario, cuadrilla, ordenes, flujo)
  assert.equal(copia.version, 2)
  assert.deepEqual(copia.estados[0], { id: 1, nombre: 'Planificada', color: '#1D4E89', inicial: false, cierre: false, siguientes: [3, 2] })
  assert.deepEqual(copia.estados[1], { id: 3, nombre: 'En curso', color: '#9A4A12', inicial: false, cierre: false, siguientes: [2] })
  flujo[0].siguientes.push(99)
  assert.deepEqual(copia.estados[0].siguientes, [3, 2]) // es una copia: no cambia si cambia el original
  flujo[0].siguientes.pop()
})

test('una copia de la versión anterior (sin estados) no se usa: hay que volver a guardarla', () => {
  const copia = crearCopia(usuario, cuadrilla, ordenes, flujo)
  assert.equal(copiaDelUsuario({ ...copia, version: 1 }, usuario), false)
  assert.equal(copiaDelUsuario({ ...copia, estados: undefined }, usuario), false)
})

test('cuando el servidor confirma un cambio, la copia queda con el estado confirmado', () => {
  const copia = crearCopia(usuario, cuadrilla, ordenes, flujo)
  const nueva = actualizarCopia(copia, { tipo: 'CAMBIO_ESTADO', ordenId: 4 },
    { respuesta: { id: 4, estadoId: 3, estadoNombre: 'En curso', estadoColor: '#9A4A12' } })
  assert.deepEqual([nueva.ordenes[0].estadoId, nueva.ordenes[0].estadoNombre, nueva.ordenes[0].estadoColor], [3, 'En curso', '#9A4A12'])
  assert.equal(copia.ordenes[0].estadoId, 1) // no modifica la copia anterior
  assert.equal(nueva.ordenes[1], copia.ordenes[1]) // las demás quedan igual
})

test('ante un conflicto la copia queda como está de verdad, o pierde la OT si ya no es de la cuadrilla', () => {
  const copia = crearCopia(usuario, cuadrilla, ordenes, flujo)
  const cambio = { tipo: 'CAMBIO_ESTADO', ordenId: 4 }
  const cerrada = actualizarCopia(copia, cambio, { conflicto: { motivo: 'ORDEN_CERRADA', estadoActualId: 2, estadoActual: 'Finalizada' } })
  assert.deepEqual([cerrada.ordenes[0].estadoId, cerrada.ordenes[0].estadoNombre, cerrada.ordenes[0].estadoColor], [2, 'Finalizada', '#2E7D32'])
  for (const motivo of ['OTRA_CUADRILLA', 'ORDEN_NO_EXISTE']) {
    assert.deepEqual(actualizarCopia(copia, cambio, { conflicto: { motivo } }).ordenes.map((orden) => orden.id), [1])
  }
  assert.equal(actualizarCopia(copia, cambio, { conflicto: { motivo: null } }).ordenes[0], copia.ordenes[0]) // sin datos: igual
  assert.equal(actualizarCopia(copia, { tipo: 'ALTA_ORDEN' }, { respuesta: { id: 9 } }), copia) // un alta no toca la copia
  assert.equal(actualizarCopia(null, cambio, {}), null)
})
