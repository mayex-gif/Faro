import test from 'node:test'
import assert from 'node:assert/strict'
import {
  activarRegla, crearRegla, desviosDeRegla, desviosGlobales, ejecutarRegla, eliminarRegla,
  listarReglas, modificarRegla, pausarRegla,
} from '../src/api/mantenimiento.js'
import {
  FORMULARIO_VACIO, filtrarReglas, formularioDesde, pedidoDesde, resumenRecurrencia, validarFormulario,
} from '../src/utils/mantenimiento.js'

const reglas = [
  {
    id: 1, titulo: 'Poda plaza San Martín', descripcion: 'Poda mensual', tipoTrabajo: 'PODA', prioridad: 'MEDIA',
    lugarId: 3, lugarNombre: 'Plaza San Martín', cuadrillaId: null, cuadrillaNombre: null,
    frecuencia: 'MENSUAL', intervalo: 1, diaSemana: null, diaMes: 15, fechaInicio: '2026-10-01', fechaFin: null,
    proximaEjecucion: '2026-11-15', ultimaGeneracion: null, activa: true, fechaCreacion: '2026-10-01T10:00:00',
  },
  {
    id: 2, titulo: 'Limpieza quincenal', descripcion: 'Cada 2 semanas', tipoTrabajo: 'LIMPIEZA', prioridad: 'BAJA',
    lugarId: 4, lugarNombre: 'Terminal', cuadrillaId: 2, cuadrillaNombre: 'Cuadrilla Verde',
    frecuencia: 'SEMANAL', intervalo: 2, diaSemana: 1, diaMes: null, fechaInicio: '2026-09-01', fechaFin: null,
    proximaEjecucion: null, ultimaGeneracion: null, activa: false, fechaCreacion: '2026-09-01T10:00:00',
  },
]

// ---------- API: a qué dirección y con qué método pide cada función ----------

function fetchFalso(t, { status = 200, cuerpo = {} } = {}) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, metodo: opciones.method ?? 'GET', cuerpo: opciones.body ? JSON.parse(opciones.body) : null })
    return { ok: status >= 200 && status < 300, status, json: async () => cuerpo }
  })
  return pedidos
}

test('listarReglas pide GET /api/mantenimiento-reglas con los filtros opcionales', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: reglas })
  await listarReglas()
  assert.equal(pedidos[0].url, '/api/mantenimiento-reglas')
  await listarReglas({ activa: true, lugarId: 3 })
  assert.equal(pedidos[1].url, '/api/mantenimiento-reglas?activa=true&lugarId=3')
})

test('crearRegla manda POST con los datos', async (t) => {
  const pedidos = fetchFalso(t, { status: 201, cuerpo: reglas[0] })
  await crearRegla({ titulo: 'Poda plaza San Martín' })
  assert.deepEqual(pedidos[0], { url: '/api/mantenimiento-reglas', metodo: 'POST', cuerpo: { titulo: 'Poda plaza San Martín' } })
})

test('modificarRegla manda PUT a la regla', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: reglas[0] })
  await modificarRegla(1, { titulo: 'Poda plaza' })
  assert.deepEqual(pedidos[0], { url: '/api/mantenimiento-reglas/1', metodo: 'PUT', cuerpo: { titulo: 'Poda plaza' } })
})

test('pausarRegla y activarRegla mandan PATCH', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: reglas[0] })
  await pausarRegla(1)
  await activarRegla(1)
  assert.equal(pedidos[0].url, '/api/mantenimiento-reglas/1/pausar')
  assert.equal(pedidos[0].metodo, 'PATCH')
  assert.equal(pedidos[1].url, '/api/mantenimiento-reglas/1/activar')
})

test('eliminarRegla manda DELETE', async (t) => {
  const pedidos = fetchFalso(t, { status: 204 })
  await eliminarRegla(1)
  assert.deepEqual(pedidos[0], { url: '/api/mantenimiento-reglas/1', metodo: 'DELETE', cuerpo: null })
})

test('ejecutarRegla manda POST a /ejecutar', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: {} })
  await ejecutarRegla(1)
  assert.equal(pedidos[0].url, '/api/mantenimiento-reglas/1/ejecutar')
  assert.equal(pedidos[0].metodo, 'POST')
})

test('desviosDeRegla y desviosGlobales piden GET', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: {} })
  await desviosDeRegla(1)
  await desviosGlobales()
  assert.equal(pedidos[0].url, '/api/mantenimiento-reglas/1/desvios')
  assert.equal(pedidos[1].url, '/api/mantenimiento-reglas/desvios')
})

// ---------- utils: formulario, validación y filtros ----------

test('validarFormulario exige los campos obligatorios según la frecuencia', () => {
  const vacio = validarFormulario(FORMULARIO_VACIO)
  assert.ok(vacio.titulo)
  assert.ok(vacio.descripcion)
  assert.ok(vacio.tipoTrabajo)
  assert.ok(vacio.prioridad)
  assert.ok(vacio.lugarId)
  assert.ok(vacio.frecuencia)
  assert.ok(vacio.fechaInicio)
  assert.ok(!vacio.intervalo) // "1" por defecto es válido

  const semanalSinDia = validarFormulario({ ...FORMULARIO_VACIO, frecuencia: 'SEMANAL', titulo: 'x', descripcion: 'x', tipoTrabajo: 'PODA', prioridad: 'BAJA', lugarId: '1', fechaInicio: '2026-10-01' })
  assert.ok(semanalSinDia.diaSemana)

  const mensualDiaInvalido = validarFormulario({ ...FORMULARIO_VACIO, frecuencia: 'MENSUAL', diaMes: '40', titulo: 'x', descripcion: 'x', tipoTrabajo: 'PODA', prioridad: 'BAJA', lugarId: '1', fechaInicio: '2026-10-01' })
  assert.ok(mensualDiaInvalido.diaMes)
})

test('validarFormulario rechaza fecha de fin anterior a la de inicio', () => {
  const errores = validarFormulario({
    ...FORMULARIO_VACIO, titulo: 'x', descripcion: 'x', tipoTrabajo: 'PODA', prioridad: 'BAJA', lugarId: '1',
    frecuencia: 'DIARIA', fechaInicio: '2026-10-10', fechaFin: '2026-10-01',
  })
  assert.ok(errores.fechaFin)
})

test('validarFormulario acepta un formulario diario completo', () => {
  const errores = validarFormulario({
    ...FORMULARIO_VACIO, titulo: 'Riego', descripcion: 'Riego diario', tipoTrabajo: 'LIMPIEZA', prioridad: 'BAJA',
    lugarId: '1', frecuencia: 'DIARIA', fechaInicio: '2026-10-01',
  })
  assert.deepEqual(errores, {})
})

test('formularioDesde y pedidoDesde van y vuelven entre la regla del backend y el formulario', () => {
  const formulario = formularioDesde(reglas[0])
  assert.equal(formulario.lugarId, '3')
  assert.equal(formulario.diaMes, '15')
  const pedido = pedidoDesde(formulario)
  assert.equal(pedido.lugarId, 3)
  assert.equal(pedido.diaMes, 15)
  assert.equal(pedido.diaSemana, null) // es mensual: no manda día de la semana
  assert.equal(pedido.cuadrillaId, null)
})

test('resumenRecurrencia describe la frecuencia en texto', () => {
  assert.equal(resumenRecurrencia(reglas[0]), 'Cada mes, el día 15')
  assert.equal(resumenRecurrencia(reglas[1]), 'Cada 2 semanas, los lunes')
  assert.equal(resumenRecurrencia({ frecuencia: 'DIARIA', intervalo: 3 }), 'Cada 3 días')
})

test('filtrarReglas busca por texto y filtra por estado', () => {
  assert.equal(filtrarReglas(reglas, { estado: 'activas' }).length, 1)
  assert.equal(filtrarReglas(reglas, { estado: 'pausadas' }).length, 1)
  assert.equal(filtrarReglas(reglas, { texto: 'terminal', estado: 'todas' })[0].id, 2)
  assert.equal(filtrarReglas(reglas, { texto: 'inexistente' }).length, 0)
})
