import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALTA_ORDEN, CAMBIO_ESTADO, CONFLICTO, PENDIENTE, REINTENTAR, SESION,
  aplicarIgual, aplicarPendientes, clasificarError, conflictoDesdeError, crearAltaOrden, crearCambioEstado, cuantosSeEnviaron,
  cuerpoDeEnvio, estaEsperando, marcarConflicto, nuevoNumero, operacionValida, resumenCola, siguienteParaEnviar, sumarIntento,
} from '../src/offline/datosCola.js'

const capataz = { id: 5, nombre: 'Carlos', apellido: 'Rodríguez', rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 1 }
const planificada = { id: 2, nombre: 'Planificada', color: '#1D4E89', inicial: false }
const enCurso = { id: 3, nombre: 'En curso', color: '#9A4A12', inicial: false }
const finalizada = { id: 4, nombre: 'Finalizada', color: '#2E7D32', inicial: false, cierre: true }
const pendiente = { id: 1, nombre: 'Pendiente', color: '#566A73', inicial: true }
const ot7 = { id: 7, descripcion: 'Podar el fresno', lugarNombre: 'Plaza San Martín', estadoId: 2, estadoNombre: 'Planificada', estadoColor: '#1D4E89' }
const ot8 = { id: 8, descripcion: 'Cortar el pasto', lugarNombre: 'Plaza principal', estadoId: 2, estadoNombre: 'Planificada' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function cambio(orden, estado, minuto, numero) {
  return crearCambioEstado(capataz, orden, estado, { ahora: new Date(Date.UTC(2026, 9, 26, 13, minuto)), numero })
}

test('el número de comanda es un UUID, también donde no existe crypto.randomUUID (celular por http)', () => {
  assert.match(nuevoNumero(), UUID)
  const sinRandomUUID = { getRandomValues: (arreglo) => globalThis.crypto.getRandomValues(arreglo) }
  const a = nuevoNumero(sinRandomUUID)
  assert.match(a, UUID)
  assert.notEqual(a, nuevoNumero(sinRandomUUID))
})

test('un cambio de estado guarda en qué estado se vio la OT y lo necesario para mostrarlo sin señal', () => {
  const operacion = cambio(ot7, enCurso, 32, 'n-1')
  assert.deepEqual(operacion, {
    operacionId: 'n-1', tipo: CAMBIO_ESTADO, usuarioId: 5, usuarioNombre: 'Carlos Rodríguez', estado: PENDIENTE,
    creadaEn: '2026-10-26T13:32:00.000Z', intentos: 0, conflicto: null,
    ordenId: 7, estadoId: 3, estadoAnteriorId: 2,
    descripcion: 'Podar el fresno', lugarNombre: 'Plaza San Martín',
    estadoNombre: 'En curso', estadoColor: '#9A4A12', estadoAnteriorNombre: 'Planificada',
  })
  assert.deepEqual(cuerpoDeEnvio(operacion), { ordenId: 7, estadoId: 3, estadoAnteriorId: 2, hechoEn: '2026-10-26T13:32:00.000Z' })
})

test('un alta guarda solo los datos de la OT que pide el backend', () => {
  const mesa = { id: 2, nombre: 'Ana', apellido: 'Martínez' }
  const datos = { descripcion: 'Bache', tipo: 'BACHEO', origen: 'RECLAMO_VECINAL', prioridad: 'ALTA', lugarId: 3, otraCosa: 'x' }
  const operacion = crearAltaOrden(mesa, datos, 'Calle Córdoba', { ahora: new Date(Date.UTC(2026, 9, 26, 13, 0)), numero: 'n-2' })
  assert.equal(operacion.tipo, ALTA_ORDEN)
  assert.equal(operacion.usuarioNombre, 'Ana Martínez')
  assert.equal(operacion.lugarNombre, 'Calle Córdoba')
  assert.deepEqual(cuerpoDeEnvio(operacion), {
    orden: { descripcion: 'Bache', tipo: 'BACHEO', origen: 'RECLAMO_VECINAL', prioridad: 'ALTA', lugarId: 3 },
    hechoEn: '2026-10-26T13:00:00.000Z',
  })
})

test('sin señal o con error del servidor se reintenta; 401 espera la sesión; el resto es conflicto', () => {
  assert.equal(clasificarError(new TypeError('Failed to fetch')), REINTENTAR)
  assert.equal(clasificarError({ estado: 500 }), REINTENTAR)
  assert.equal(clasificarError({ estado: 503 }), REINTENTAR)
  assert.equal(clasificarError({ estado: 429 }), REINTENTAR)
  assert.equal(clasificarError({ estado: 401 }), SESION)
  for (const estado of [400, 403, 404, 409]) assert.equal(clasificarError({ estado }), CONFLICTO)
})

test('el conflicto se lee de la respuesta 409 del backend (que manda todo como texto)', () => {
  const error = Object.assign(new Error('Mientras no tenías señal, la OT #7 pasó a Pendiente: tu cambio no se aplicó.'), {
    estado: 409, errores: { motivo: 'ESTADO_CAMBIADO', sePuedeAplicar: 'true', estadoActualId: '1', estadoActual: 'Pendiente' },
  })
  assert.deepEqual(conflictoDesdeError(error), {
    mensaje: 'Mientras no tenías señal, la OT #7 pasó a Pendiente: tu cambio no se aplicó.',
    motivo: 'ESTADO_CAMBIADO', sePuedeAplicar: true, estadoActualId: 1, estadoActual: 'Pendiente',
  })
  // Un 403 común (sin motivo) también es conflicto, pero no se puede aplicar igual
  assert.deepEqual(conflictoDesdeError({ estado: 403, message: 'Esta orden no es de tu cuadrilla', errores: {} }), {
    mensaje: 'Esta orden no es de tu cuadrilla', motivo: null, sePuedeAplicar: false, estadoActualId: null, estadoActual: null,
  })
})

test('"aplicar igual" usa un número nuevo, el estado actual como anterior y conserva su lugar en el cuaderno', () => {
  const chocado = marcarConflicto(sumarIntento(cambio(ot7, enCurso, 32, 'viejo')), {
    mensaje: '…', motivo: 'ESTADO_CAMBIADO', sePuedeAplicar: true, estadoActualId: 1, estadoActual: 'Pendiente',
  })
  const deNuevo = aplicarIgual(chocado, { numero: 'nuevo' })
  assert.equal(deNuevo.operacionId, 'nuevo')
  assert.equal(deNuevo.estadoAnteriorId, 1)
  assert.equal(deNuevo.estadoAnteriorNombre, 'Pendiente')
  assert.equal(deNuevo.estadoId, 3)
  assert.equal(deNuevo.estado, PENDIENTE)
  assert.equal(deNuevo.conflicto, null)
  assert.equal(deNuevo.intentos, 0)
  assert.equal(deNuevo.creadaEn, chocado.creadaEn)
})

test('se manda en el orden en que se anotó', () => {
  const primero = cambio(ot7, enCurso, 30, 'b')
  const segundo = cambio(ot8, enCurso, 31, 'a')
  assert.equal(siguienteParaEnviar([segundo, primero]), primero)
  assert.equal(siguienteParaEnviar([]), null)
})

test('un cambio espera si antes chocó otro cambio de la misma OT; los de otras OT siguen', () => {
  const iniciar = marcarConflicto(cambio(ot7, enCurso, 30, 'a'), { mensaje: '…' })
  const finalizar = cambio({ ...ot7, estadoId: 3 }, finalizada, 31, 'b')
  const otraOrden = cambio(ot8, enCurso, 32, 'c')
  const cola = [iniciar, finalizar, otraOrden]
  assert.equal(siguienteParaEnviar(cola), otraOrden)
  assert.equal(estaEsperando(cola, finalizar), true)
  assert.equal(estaEsperando(cola, otraOrden), false)
  // Cuando la persona resuelve el conflicto (lo descarta), "finalizar" se puede mandar
  assert.equal(siguienteParaEnviar([finalizar, otraOrden]), finalizar)
})

test('la lista muestra los cambios sin enviar y las OT nuevas, sin tocar los datos originales', () => {
  const ordenes = [ot7, ot8]
  const alta = crearAltaOrden(capataz, { descripcion: 'Bache', tipo: 'BACHEO', origen: 'RECLAMO_VECINAL', prioridad: 'ALTA', lugarId: 3 },
    'Calle Córdoba', { ahora: new Date(Date.UTC(2026, 9, 26, 13, 40)), numero: 'alta' })
  const chocado = marcarConflicto(cambio(ot8, enCurso, 35, 'x'), { mensaje: '…' })
  const vista = aplicarPendientes(ordenes, [cambio(ot7, enCurso, 30, 'a'), cambio({ ...ot7, estadoId: 3 }, finalizada, 31, 'b'), chocado, alta],
    [pendiente, planificada, enCurso, finalizada])

  assert.equal(vista.length, 3)
  assert.deepEqual(vista[0], { descripcion: 'Bache', tipo: 'BACHEO', origen: 'RECLAMO_VECINAL', prioridad: 'ALTA', lugarId: 3,
    id: null, claveLocal: 'alta', lugarNombre: 'Calle Córdoba', estadoId: 1, estadoNombre: 'Pendiente', estadoColor: '#566A73',
    cuadrillaId: null, cuadrillaNombre: null, fechaCreacion: '2026-10-26T13:40:00.000Z', sinEnviar: true })
  assert.equal(vista[1].estadoNombre, 'Finalizada') // los dos cambios de la OT 7, en orden
  assert.equal(vista[1].sinEnviar, true)
  assert.equal(vista[2], ot8) // el cambio en conflicto no se muestra como hecho
  assert.equal(ot7.estadoNombre, 'Planificada') // no se modifica el original
})

test('el resumen cuenta pendientes y conflictos', () => {
  assert.deepEqual(resumenCola([cambio(ot7, enCurso, 30, 'a'), marcarConflicto(cambio(ot8, enCurso, 31, 'b'), {})]),
    { pendientes: 1, conflictos: 1 })
  assert.deepEqual(resumenCola([]), { pendientes: 0, conflictos: 0 })
})

test('solo se aceptan renglones completos (lo leído del celular puede estar roto o ser de otra versión)', () => {
  assert.equal(operacionValida(cambio(ot7, enCurso, 30, 'a')), true)
  assert.equal(operacionValida(crearAltaOrden(capataz, { descripcion: 'Bache' }, 'X', { numero: 'b' })), true)
  for (const roto of [null, {}, { ...cambio(ot7, enCurso, 30, 'a'), tipo: 'OTRA' }, { ...cambio(ot7, enCurso, 30, 'a'), ordenId: null },
    { ...cambio(ot7, enCurso, 30, 'a'), creadaEn: 'ayer' }, { ...cambio(ot7, enCurso, 30, 'a'), estado: 'RARO' },
    { ...crearAltaOrden(capataz, { descripcion: 'Bache' }, 'X', { numero: 'b' }), orden: null }]) {
    assert.equal(operacionValida(roto), false)
  }
})

test('cuenta cuántos cambios llegaron bien (los que pasaron a revisar no cuentan)', () => {
  assert.equal(cuantosSeEnviaron({ pendientes: 3, conflictos: 0 }, { pendientes: 0, conflictos: 0 }), 3)
  assert.equal(cuantosSeEnviaron({ pendientes: 3, conflictos: 0 }, { pendientes: 0, conflictos: 1 }), 2)
  assert.equal(cuantosSeEnviaron({ pendientes: 1, conflictos: 0 }, { pendientes: 0, conflictos: 1 }), 0)
  assert.equal(cuantosSeEnviaron({ pendientes: 0, conflictos: 1 }, { pendientes: 0, conflictos: 0 }), 0) // se descartó uno
  assert.equal(cuantosSeEnviaron({ pendientes: 0, conflictos: 1 }, { pendientes: 1, conflictos: 0 }), 0) // "aplicar igual"
})
