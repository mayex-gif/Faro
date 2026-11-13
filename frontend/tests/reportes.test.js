import test from 'node:test'
import assert from 'node:assert/strict'
import { descargarDesvios, descargarOrdenesResueltas, obtenerTablero } from '../src/api/reportes.js'
import { nombreDeArchivo } from '../src/api/cliente.js'
import {
  PERIODO_INICIAL, altoBarras, describirRango, errorPeriodo, etiquetaPeriodo, filasBarras, filasDesvios, formatearDia,
  granularidadSugerida, nombreTipoTrabajo, parametrosReporte, porcentaje, serieEvolucion, tableroVacio,
  pesos, resumenGastos, serieMontos,
} from '../src/utils/reportes.js'

// ---------- API ----------

function fetchFalso(t, { status = 200, cuerpo = {}, encabezados = {} } = {}) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, metodo: opciones.method ?? 'GET', headers: opciones.headers })
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => cuerpo,
      blob: async () => new Blob(['ID OT\n1\n'], { type: 'text/csv' }),
      headers: { get: (nombre) => encabezados[nombre] ?? null },
    }
  })
  return pedidos
}

test('obtenerTablero pide GET /api/reportes/dashboard con el atajo y la agrupación', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { totalOts: 3 } })
  const datos = await obtenerTablero(parametrosReporte(PERIODO_INICIAL))
  assert.equal(pedidos[0].metodo, 'GET')
  assert.equal(pedidos[0].url, '/api/reportes/dashboard?atajo=MES&granularidad=DIA')
  assert.equal(datos.totalOts, 3)
})

test('el atajo AÑO viaja codificado (la Ñ del enum del backend)', () => {
  assert.equal(parametrosReporte({ atajo: 'AÑO', granularidad: 'MES' }).toString(), 'atajo=A%C3%91O&granularidad=MES')
})

test('los CSV se piden con la sesión y devuelven el archivo con el nombre que propone el backend', async (t) => {
  const pedidos = fetchFalso(t, { encabezados: { 'Content-Disposition': 'attachment; filename="desvios-2026-11-06.csv"' } })
  const archivo = await descargarDesvios(parametrosReporte({ atajo: 'SEMANA' }, { conGranularidad: false }))
  assert.equal(pedidos[0].url, '/api/reportes/desvios/csv?atajo=SEMANA')
  assert.equal(archivo.nombre, 'desvios-2026-11-06.csv')
  assert.ok(archivo.contenido instanceof Blob)
})

test('si el backend no informa el nombre del CSV se usa uno por defecto', async (t) => {
  const pedidos = fetchFalso(t)
  const archivo = await descargarOrdenesResueltas(parametrosReporte({ atajo: 'PERSONALIZADO', desde: '2026-10-01', hasta: '2026-10-31' }, { conGranularidad: false }))
  assert.equal(pedidos[0].url, '/api/reportes/ots-resueltas/csv?desde=2026-10-01&hasta=2026-10-31')
  assert.equal(archivo.nombre, 'ots-resueltas.csv')
})

test('un error del backend en la descarga llega como ErrorApi con su mensaje', async (t) => {
  fetchFalso(t, { status: 400, cuerpo: { mensaje: "La fecha 'desde' no puede ser posterior a 'hasta'" } })
  await assert.rejects(descargarDesvios(new URLSearchParams()), { estado: 400, message: "La fecha 'desde' no puede ser posterior a 'hasta'" })
})

test('nombreDeArchivo entiende filename y filename*', () => {
  assert.equal(nombreDeArchivo('attachment; filename="a.csv"', 'x.csv'), 'a.csv')
  assert.equal(nombreDeArchivo("attachment; filename*=UTF-8''desv%C3%ADos.csv", 'x.csv'), 'desvíos.csv')
  assert.equal(nombreDeArchivo(null, 'x.csv'), 'x.csv')
})

// ---------- Período ----------

test('con "Otras fechas" se mandan desde y hasta, y no el atajo', () => {
  const p = parametrosReporte({ atajo: 'PERSONALIZADO', desde: '2026-10-01', hasta: '2026-10-31', granularidad: 'SEMANA' })
  assert.equal(p.toString(), 'desde=2026-10-01&hasta=2026-10-31&granularidad=SEMANA')
})

test('errorPeriodo pide las dos fechas y en orden; los atajos nunca tienen error', () => {
  assert.equal(errorPeriodo({ atajo: 'HOY' }), null)
  assert.match(errorPeriodo({ atajo: 'PERSONALIZADO', desde: '2026-10-01', hasta: '' }), /dos fechas/)
  assert.match(errorPeriodo({ atajo: 'PERSONALIZADO', desde: '2026-11-02', hasta: '2026-11-01' }), /anterior o igual/)
  assert.equal(errorPeriodo({ atajo: 'PERSONALIZADO', desde: '2026-11-01', hasta: '2026-11-01' }), null)
})

test('la agrupación sugerida: por mes para el año, por día para períodos cortos', () => {
  assert.equal(granularidadSugerida('AÑO'), 'MES')
  assert.equal(granularidadSugerida('MES'), 'DIA')
  assert.equal(granularidadSugerida('PERSONALIZADO'), 'SEMANA')
})

// ---------- Textos ----------

test('formatearDia y describirRango no se corren un día por la zona horaria', () => {
  assert.equal(formatearDia('2026-11-01'), '1/11/2026')
  assert.equal(describirRango('2026-11-01', '2026-11-06'), '1/11/2026 al 6/11/2026')
  assert.equal(describirRango('2026-11-06', '2026-11-06'), '6/11/2026')
})

test('etiquetaPeriodo entiende día, semana ISO y mes', () => {
  assert.equal(etiquetaPeriodo('2026-11-06'), '6/11')
  assert.equal(etiquetaPeriodo('2026-11-06', { larga: true }), '6 de noviembre de 2026')
  assert.equal(etiquetaPeriodo('2026-W45'), 'Sem. 45')
  assert.equal(etiquetaPeriodo('2026-W05', { larga: true }), 'Semana 5 de 2026')
  assert.equal(etiquetaPeriodo('2026-09'), 'sep 26')
  assert.equal(etiquetaPeriodo('2026-09', { larga: true }), 'Septiembre de 2026')
  assert.equal(etiquetaPeriodo('otro'), 'otro')
})

test('nombreTipoTrabajo usa las mismas etiquetas que las órdenes', () => {
  assert.equal(nombreTipoTrabajo('CORTE_DE_PASTO'), 'Corte de pasto')
})

// ---------- Cálculos ----------

test('porcentaje redondea y no divide por cero', () => {
  assert.equal(porcentaje(31, 48), 65)
  assert.equal(porcentaje(0, 0), 0)
})

test('filasBarras ordena de mayor a menor y calcula el % de cada fila', () => {
  const filas = filasBarras(
    [{ n: 'Poda', c: 5 }, { n: 'Bacheo', c: 10 }, { n: 'Alumbrado', c: 5 }],
    { nombre: (f) => f.n, valor: (f) => f.c },
  )
  assert.deepEqual(filas.map((f) => f.nombre), ['Bacheo', 'Alumbrado', 'Poda'])
  assert.deepEqual(filas.map((f) => f.parte), [50, 25, 25])
  assert.deepEqual(filasBarras([], { nombre: () => '', valor: () => 0 }), [])
})

test('filasBarras con ordenar: false respeta el orden recibido', () => {
  const filas = filasBarras([{ n: 'B', c: 1 }, { n: 'A', c: 9 }], { nombre: (f) => f.n, valor: (f) => f.c }, { ordenar: false })
  assert.deepEqual(filas.map((f) => f.nombre), ['B', 'A'])
})

test('serieEvolucion agrega las etiquetas corta y larga de cada período', () => {
  const [punto] = serieEvolucion([{ periodo: '2026-W45', otsCreadas: 3, otsCerradas: 1 }])
  assert.equal(punto.etiqueta, 'Sem. 45')
  assert.equal(punto.etiquetaLarga, 'Semana 45 de 2026')
  assert.equal(punto.otsCreadas, 3)
  assert.deepEqual(serieEvolucion(undefined), [])
})

test('filasDesvios deja solo las categorías con órdenes, en su orden y con su color', () => {
  const filas = filasDesvios({ aTiempo: 6, adelantadas: 0, demoradas: 2, pendientesVencidas: 0, pendientesEnPlazo: 2, canceladas: 0 })
  assert.deepEqual(filas.map((f) => f.nombre), ['A tiempo', 'Demoradas', 'Pendientes en plazo'])
  assert.deepEqual(filas.map((f) => f.parte), [60, 20, 20])
  assert.ok(filas.every((f) => /^#[0-9A-F]{6}$/i.test(f.color)))
  assert.deepEqual(filasDesvios(null), [])
})

test('altoBarras crece con las filas y tiene un mínimo', () => {
  assert.equal(altoBarras(1), 120)
  assert.equal(altoBarras(5), 224)
})

test('tableroVacio solo cuando no hubo órdenes ni programadas', () => {
  assert.equal(tableroVacio({ totalOts: 0, resumenDesvios: { totalConPlanificacion: 0 } }), true)
  assert.equal(tableroVacio({ totalOts: 0, resumenDesvios: { totalConPlanificacion: 2 } }), false)
  assert.equal(tableroVacio({ totalOts: 4, resumenDesvios: null }), false)
})

// ===================== Montos gastados (declarado + gasto adicional) =====================

test('el total gastado suma lo declarado y los gastos adicionales', () => {
  assert.deepEqual(resumenGastos({ montoAproximadoTotal: 37000, gastoAdicionalTotal: 9500.5 }), { declarado: 37000, adicional: 9500.5, total: 46500.5 })
  // Un backend anterior (sin gasto adicional) o un tablero vacío: ceros
  assert.deepEqual(resumenGastos({ montoAproximadoTotal: 1000 }), { declarado: 1000, adicional: 0, total: 1000 })
  assert.deepEqual(resumenGastos(null), { declarado: 0, adicional: 0, total: 0 })
})

test('la serie de montos trae lo declarado, lo adicional y el total de cada período', () => {
  const serie = serieMontos([
    { periodo: '2026-10', montoAproximado: 25000, gastoAdicional: 8000.5 },
    { periodo: '2026-11', montoAproximado: 12000 }, // backend anterior: sin gasto adicional
  ])
  assert.equal(serie[0].declarado, 25000)
  assert.equal(serie[0].adicional, 8000.5)
  assert.equal(serie[0].total, 33000.5)
  assert.equal(serie[1].adicional, 0)
  assert.equal(serie[1].etiqueta, etiquetaPeriodo('2026-11'))
  assert.deepEqual(serieMontos(), [])
})

test('los pesos del tablero van sin centavos', () => {
  assert.equal(pesos(46500.5).replace(/\s/g, ' '), '$ 46.501')
  assert.equal(pesos(null).replace(/\s/g, ' '), '$ 0')
})
