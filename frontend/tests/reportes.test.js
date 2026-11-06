import test from 'node:test'
import assert from 'node:assert/strict'
import { descargarDesvios, descargarOrdenesResueltas, obtenerTablero } from '../src/api/reportes.js'
import { nombreDeArchivo } from '../src/api/cliente.js'
import {
  PERIODO_INICIAL, describirRango, errorPeriodo, etiquetaPeriodo, filasBarras, formatearDia, granularidadSugerida,
  marcasEje, nombreTipoTrabajo, parametrosReporte, porcentaje, tableroVacio,
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

test('filasBarras ordena de mayor a menor y mide cada barra contra la más grande', () => {
  const filas = filasBarras(
    [{ n: 'Poda', c: 5 }, { n: 'Bacheo', c: 10 }, { n: 'Alumbrado', c: 5 }],
    { nombre: (f) => f.n, valor: (f) => f.c },
  )
  assert.deepEqual(filas.map((f) => f.nombre), ['Bacheo', 'Alumbrado', 'Poda'])
  assert.deepEqual(filas.map((f) => f.ancho), [100, 50, 50])
  assert.deepEqual(filas.map((f) => f.parte), [50, 25, 25])
  assert.deepEqual(filasBarras([], { nombre: () => '', valor: () => 0 }), [])
})

test('marcasEje arma valores redondos que cubren el máximo', () => {
  assert.deepEqual(marcasEje(12), [0, 5, 10, 15])
  assert.deepEqual(marcasEje(4), [0, 1, 2, 3, 4])
  assert.deepEqual(marcasEje(0), [0, 1])
  const grandes = marcasEje(230)
  assert.ok(grandes.at(-1) >= 230)
  assert.ok(grandes.length <= 6)
})

test('tableroVacio solo cuando no hubo órdenes ni programadas', () => {
  assert.equal(tableroVacio({ totalOts: 0, resumenDesvios: { totalConPlanificacion: 0 } }), true)
  assert.equal(tableroVacio({ totalOts: 0, resumenDesvios: { totalConPlanificacion: 2 } }), false)
  assert.equal(tableroVacio({ totalOts: 4, resumenDesvios: null }), false)
})
