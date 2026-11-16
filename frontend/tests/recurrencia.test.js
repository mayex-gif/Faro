import test from 'node:test'
import assert from 'node:assert/strict'
import { crearRegla } from '../src/api/mantenimiento.js'
import { fechaProgramada, hoyArgentina, pedidoDeProgramacion, primeraFecha, recurrenciaInicial, validarProgramacion } from '../src/utils/recurrencia.js'

const orden = { descripcion: ' Cortar pasto de la plaza ', tipo: 'CORTE_DE_PASTO', origen: 'RECLAMO_VECINAL', prioridad: 'MEDIA', lugarId: '3' }
const recurrencia = { ...recurrenciaInicial(), habilitada: true, titulo: ' Corte quincenal ', frecuencia: 'SEMANAL', intervalo: '2', diaSemana: '1', fechaInicio: '2027-02-01' }

test('la programación reutiliza los datos del trabajo y envía el DTO de regla, sin crear una OT aparte', async (t) => {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, metodo: opciones.method, datos: JSON.parse(opciones.body) })
    return { ok: true, status: 201, json: async () => ({ id: 7, proximaEjecucion: '2027-02-01' }) }
  })
  const pedido = pedidoDeProgramacion(orden, recurrencia)
  const respuesta = await crearRegla(pedido)
  assert.equal(respuesta.id, 7)
  assert.equal(pedidos.length, 1)
  assert.deepEqual(pedidos[0], { url: '/api/mantenimiento-reglas', metodo: 'POST', datos: {
    titulo: 'Corte quincenal', descripcion: 'Cortar pasto de la plaza', tipoTrabajo: 'CORTE_DE_PASTO', prioridad: 'MEDIA', lugarId: 3,
    cuadrillaId: null, frecuencia: 'SEMANAL', intervalo: 2, diaSemana: 1, diaMes: null, fechaInicio: '2027-02-01', fechaFin: null, activa: true,
  } })
  assert.equal(orden.origen, 'RECLAMO_VECINAL') // el formulario común conserva el origen al desactivar la recurrencia
})

test('un fallo de red al guardar una regla se propaga sin reintentos automáticos', async (t) => {
  let pedidos = 0
  t.mock.method(globalThis, 'fetch', async () => { pedidos++; throw new TypeError('Sin red') })
  await assert.rejects(crearRegla(pedidoDeProgramacion(orden, recurrencia)), /Sin red/)
  assert.equal(pedidos, 1)
})

test('valida nombre, frecuencia, intervalo y día semanal antes de programar', () => {
  assert.deepEqual(validarProgramacion(orden, recurrencia, '2027-01-30'), {})
  const errores = validarProgramacion(orden, { ...recurrencia, titulo: '', intervalo: '0', diaSemana: '8' }, '2027-01-30')
  assert.ok(errores.titulo)
  assert.ok(errores.intervalo)
  assert.ok(errores.diaSemana)
  assert.ok(validarProgramacion(orden, { ...recurrencia, frecuencia: 'OTRA' }, '2027-01-30').frecuencia)
  assert.ok(validarProgramacion({ ...orden, tipo: '' }, recurrencia, '2027-01-30').tipo)
})

test('la regla nueva no admite fechas pasadas, inválidas ni un rango sin ninguna ejecución', () => {
  assert.ok(validarProgramacion(orden, recurrencia, '2027-02-02').fechaInicio)
  assert.ok(validarProgramacion(orden, { ...recurrencia, fechaInicio: '2027-02-30' }, '2027-01-30').fechaInicio)
  assert.ok(validarProgramacion(orden, { ...recurrencia, fechaInicio: '2027-02-02', fechaFin: '2027-02-03' }, '2027-01-30').fechaFin)
  assert.ok(validarProgramacion(orden, { ...recurrencia, fechaFin: '2027-01-31' }, '2027-01-30').fechaFin)
})

test('la primera ejecución semanal incluye el día de inicio si coincide, igual que el servidor', () => {
  assert.equal(primeraFecha(recurrencia), '2027-02-01')
  assert.equal(primeraFecha({ ...recurrencia, fechaInicio: '2027-02-02' }), '2027-02-08')
  assert.equal(primeraFecha({ ...recurrencia, frecuencia: 'DIARIA', intervalo: '5' }), '2027-02-01')
})

test('la primera ejecución mensual ajusta fin de mes, año y febrero bisiesto', () => {
  const mensual = { frecuencia: 'MENSUAL', diaMes: '31' }
  assert.equal(primeraFecha({ ...mensual, fechaInicio: '2027-02-01' }), '2027-02-28')
  assert.equal(primeraFecha({ ...mensual, fechaInicio: '2028-02-01' }), '2028-02-29')
  assert.equal(primeraFecha({ ...mensual, diaMes: '1', fechaInicio: '2027-12-02' }), '2028-01-01')
  assert.equal(primeraFecha({ ...mensual, diaMes: '', fechaInicio: '2027-02-01' }), null)
})

test('las fechas de calendario no retroceden por el huso horario', () => {
  assert.equal(hoyArgentina(new Date('2026-11-03T01:00:00Z')), '2026-11-02')
  assert.equal(fechaProgramada('2027-02-01'), '01/02/2027')
  assert.equal(fechaProgramada(null), 'a confirmar por el servidor')
})
