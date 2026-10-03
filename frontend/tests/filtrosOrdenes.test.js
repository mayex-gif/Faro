import test from 'node:test'
import assert from 'node:assert/strict'
import { FILTROS_ORDENES_VACIOS, filtrarOrdenes, rangoFechasValido } from '../src/utils/filtrosOrdenes.js'

// Solo datos en memoria: no se modifica la base.
const ordenes = [
  { id: 31, descripcion: 'Reparar luminária', lugarId: 2, lugarNombre: 'Calle San Martín',
    tipo: 'ALUMBRADO', origen: 'RECLAMO_VECINAL', prioridad: 'URGENTE', fechaCreacion: '2026-10-02T00:00:00' },
  { id: 30, descripcion: 'Poda de árboles', lugarId: 1, lugarNombre: 'Plaza central',
    tipo: 'PODA', origen: 'PLAN_MANTENIMIENTO', prioridad: 'ALTA', fechaCreacion: '2026-10-01T23:59:59' },
  { id: 29, descripcion: 'Limpieza del sector juegos', lugarId: 1, lugarNombre: 'Plaza central',
    tipo: 'LIMPIEZA', origen: 'ORDEN_DIRECTA', prioridad: 'MEDIA', fechaCreacion: '2026-10-01T00:00:00' },
  { id: 28, descripcion: 'Poda de árboles', lugarId: 2, lugarNombre: 'Calle San Martín',
    tipo: 'PODA', origen: 'ORDEN_DIRECTA', prioridad: 'ALTA', fechaCreacion: '2026-09-30T23:59:59' },
]
ordenes.forEach(Object.freeze)
Object.freeze(ordenes)

function ids(cambios = {}) {
  return filtrarOrdenes(ordenes, { ...FILTROS_ORDENES_VACIOS, ...cambios }).map((orden) => orden.id)
}

test('sin criterios conserva todos los registros y su orden sin modificarlos', () => {
  assert.deepEqual(ids(), [31, 30, 29, 28])
  assert.equal(filtrarOrdenes(ordenes, FILTROS_ORDENES_VACIOS)[0], ordenes[0])
})

test('busca descripción y lugar ignorando tildes, mayúsculas y espacios externos', () => {
  assert.deepEqual(ids({ texto: '  LUMINARIA  ' }), [31])
  assert.deepEqual(ids({ texto: 'san martin' }), [31, 28])
  assert.deepEqual(ids({ texto: 'arboles' }), [30, 28])
})

test('busca por número de orden', () => {
  assert.deepEqual(ids({ texto: '30' }), [30])
})

test('cada selector usa los valores del backend', () => {
  assert.deepEqual(ids({ prioridad: 'ALTA' }), [30, 28])
  assert.deepEqual(ids({ tipo: 'LIMPIEZA' }), [29])
  assert.deepEqual(ids({ origen: 'ORDEN_DIRECTA' }), [29, 28])
  assert.deepEqual(ids({ lugarId: '1' }), [30, 29])
})

test('cada orden debe cumplir todos los criterios combinados', () => {
  assert.deepEqual(ids({ texto: 'arboles', prioridad: 'ALTA', tipo: 'PODA',
    origen: 'PLAN_MANTENIMIENTO', lugarId: '1', desde: '2026-10-01', hasta: '2026-10-01' }), [30])
  assert.deepEqual(ids({ tipo: 'PODA', prioridad: 'URGENTE' }), [])
})

test('incluye principio y final del mismo día y excluye los días adyacentes', () => {
  assert.deepEqual(ids({ desde: '2026-10-01', hasta: '2026-10-01' }), [30, 29])
})

test('permite solo desde o solo hasta', () => {
  assert.deepEqual(ids({ desde: '2026-10-01' }), [31, 30, 29])
  assert.deepEqual(ids({ hasta: '2026-10-01' }), [30, 29, 28])
})

test('detecta rango invertido y acepta límites iguales', () => {
  assert.equal(rangoFechasValido({ desde: '2026-10-02', hasta: '2026-10-01' }), false)
  assert.deepEqual(ids({ desde: '2026-10-02', hasta: '2026-10-01' }), [])
  assert.equal(rangoFechasValido({ desde: '2026-10-01', hasta: '2026-10-01' }), true)
  assert.equal(rangoFechasValido(FILTROS_ORDENES_VACIOS), true)
})

test('sin coincidencias o sin registros devuelve lista vacía', () => {
  assert.deepEqual(ids({ texto: 'no existe este trabajo' }), [])
  assert.deepEqual(filtrarOrdenes([], FILTROS_ORDENES_VACIOS), [])
})

test('limpiar recupera todas las órdenes', () => {
  assert.deepEqual(ids({ prioridad: 'URGENTE' }), [31])
  assert.deepEqual(ids(), [31, 30, 29, 28])
})

test('sin fecha, solo se excluye cuando hay un límite temporal', () => {
  const sinFecha = [{ id: 10, descripcion: null, lugarNombre: null, fechaCreacion: null }]
  assert.equal(filtrarOrdenes(sinFecha, FILTROS_ORDENES_VACIOS).length, 1)
  assert.deepEqual(filtrarOrdenes(sinFecha, { ...FILTROS_ORDENES_VACIOS, desde: '2026-10-01' }), [])
  assert.deepEqual(filtrarOrdenes(sinFecha, { ...FILTROS_ORDENES_VACIOS, texto: 'null' }), [])
})

// --- Filtro por estado: datos en memoria, con estados como los informa el backend ---
const conEstado = [
  { id: 41, descripcion: 'Poda', prioridad: 'ALTA', estadoId: 1, fechaCreacion: '2026-10-02T09:00:00' },
  { id: 42, descripcion: 'Bacheo', prioridad: 'ALTA', estadoId: 2, fechaCreacion: '2026-10-02T10:00:00' },
  { id: 43, descripcion: 'Pintura', prioridad: 'BAJA', estadoId: 2, fechaCreacion: '2026-10-01T10:00:00' },
  { id: 44, descripcion: 'Orden anterior sin estado', prioridad: 'BAJA', estadoId: null, fechaCreacion: '2026-09-30T10:00:00' },
]

function idsEstado(cambios = {}) {
  return filtrarOrdenes(conEstado, { ...FILTROS_ORDENES_VACIOS, ...cambios }).map((orden) => orden.id)
}

test('estado: muestra solo las órdenes en el estado elegido', () => {
  assert.deepEqual(idsEstado({ estadoId: '2' }), [42, 43])
  assert.deepEqual(idsEstado({ estadoId: '1' }), [41])
})

test('estado: se combina con los demás criterios', () => {
  assert.deepEqual(idsEstado({ estadoId: '2', prioridad: 'ALTA' }), [42])
  assert.deepEqual(idsEstado({ estadoId: '2', texto: 'pintura' }), [43])
})

test('estado: sin coincidencias devuelve lista vacía y sin criterio no excluye a nadie', () => {
  assert.deepEqual(idsEstado({ estadoId: '99' }), [])
  assert.deepEqual(idsEstado(), [41, 42, 43, 44])
})

test('estado: una orden sin estado no aparece al filtrar por estado', () => {
  assert.ok(!idsEstado({ estadoId: '1' }).includes(44))
})
