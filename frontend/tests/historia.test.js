import test from 'node:test'
import assert from 'node:assert/strict'
import {
  agruparPorDia, contar, detalleEvento, horaEvento, nombreDia, nombreTipoLugar, ordenDelEvento, tituloEvento,
} from '../src/utils/historia.js'

// Solo datos en memoria, con la misma forma que devuelve GET /api/infraestructura/{id}/historia
const creada = {
  fecha: '2026-10-06T09:15:00', tipo: 'ORDEN_CREADA', ordenId: 12, ordenDescripcion: 'Podar el fresno',
  tipoTrabajo: 'PODA', origen: 'RECLAMO_VECINAL', prioridad: 'ALTA',
  estadoAnterior: null, estadoNuevo: null, estadoNuevoColor: null, cierre: false, cuadrilla: null,
}
const asignada = {
  fecha: '2026-10-07T08:30:00', tipo: 'CUADRILLA_ASIGNADA', ordenId: 12, ordenDescripcion: 'Podar el fresno',
  tipoTrabajo: 'PODA', origen: null, prioridad: null,
  estadoAnterior: 'Pendiente', estadoNuevo: 'En curso', estadoNuevoColor: '#9A4A12', cierre: false,
  cuadrilla: 'Cuadrilla Verde',
}
const finalizada = {
  fecha: '2026-10-07T18:45:10.5', tipo: 'CAMBIO_ESTADO', ordenId: 12, ordenDescripcion: 'Podar el fresno',
  tipoTrabajo: 'PODA', origen: null, prioridad: null,
  estadoAnterior: 'En curso', estadoNuevo: 'Finalizada', estadoNuevoColor: '#22633E', cierre: true, cuadrilla: null,
}

test('cada tipo de evento tiene su título', () => {
  assert.equal(tituloEvento(creada), 'Se registró la orden')
  assert.equal(tituloEvento(asignada), 'Se asignó a Cuadrilla Verde')
  assert.equal(tituloEvento(finalizada), 'Pasó a Finalizada')
  assert.equal(tituloEvento({ tipo: 'OTRO' }), 'Evento')
})

test('la creación detalla tipo, origen y prioridad con textos para el usuario', () => {
  assert.equal(detalleEvento(creada), 'Poda · Reclamo vecinal · Prioridad alta')
})

test('los cambios de estado y asignaciones detallan de qué estado a qué estado', () => {
  assert.equal(detalleEvento(asignada), 'De Pendiente a En curso')
  assert.equal(detalleEvento(finalizada), 'De En curso a Finalizada')
  assert.equal(detalleEvento({ tipo: 'CAMBIO_ESTADO', estadoAnterior: null, estadoNuevo: 'X' }), '')
})

test('muestra a qué orden le pasó el evento', () => {
  assert.equal(ordenDelEvento(creada), 'OT #12 · Podar el fresno')
})

test('la hora sale de la fecha del backend, sin segundos', () => {
  assert.equal(horaEvento('2026-10-07T18:45:10.5'), '18:45')
  assert.equal(horaEvento(undefined), '')
})

test('el día se muestra con el mes en palabras', () => {
  assert.equal(nombreDia('2026-10-07'), '7 de octubre de 2026')
})

test('agrupa por día respetando el orden del más nuevo al más viejo', () => {
  const grupos = agruparPorDia([finalizada, asignada, creada])

  assert.deepEqual(grupos.map((grupo) => grupo.dia), ['2026-10-07', '2026-10-06'])
  assert.deepEqual(grupos[0].eventos, [finalizada, asignada])
  assert.deepEqual(grupos[1].eventos, [creada])
})

test('sin eventos no hay grupos', () => {
  assert.deepEqual(agruparPorDia([]), [])
})

test('singular y plural', () => {
  assert.equal(contar(1, 'orden', 'órdenes'), '1 orden')
  assert.equal(contar(3, 'orden', 'órdenes'), '3 órdenes')
  assert.equal(contar(0, 'abierta', 'abiertas'), '0 abiertas')
})

test('el tipo de lugar se muestra con texto para el usuario', () => {
  assert.equal(nombreTipoLugar('ESPACIO_VERDE'), 'Espacio verde')
  assert.equal(nombreTipoLugar('LUMINARIA'), 'Luminaria')
  assert.equal(nombreTipoLugar('OTRO_TIPO'), 'OTRO_TIPO')
})