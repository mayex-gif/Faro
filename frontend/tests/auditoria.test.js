import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarAuditoria } from '../src/api/auditoria.js'
import {
  diferenciasCampos, etiqueta, formatearValorCampo, parametrosDesde, rangoValido, ACCIONES,
} from '../src/utils/auditoria.js'

// ---------- API: a qué dirección y con qué método pide cada función ----------

function fetchFalso(t, { status = 200, cuerpo = {} } = {}) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, metodo: opciones.method ?? 'GET' })
    return { ok: status >= 200 && status < 300, status, json: async () => cuerpo }
  })
  return pedidos
}

test('buscarAuditoria pide GET /api/auditoria con los filtros, la página y el tamaño', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { registros: [] } })
  await buscarAuditoria({ accion: 'MODIFICACION', actor: 'encargado@generalpaz.gob.ar' }, 2, 20)
  assert.equal(pedidos[0].metodo, 'GET')
  assert.equal(pedidos[0].url, '/api/auditoria?accion=MODIFICACION&actor=encargado%40generalpaz.gob.ar&page=2&size=20')
})

test('buscarAuditoria sin filtros solo manda page y size', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { registros: [] } })
  await buscarAuditoria({}, 0, 20)
  assert.equal(pedidos[0].url, '/api/auditoria?page=0&size=20')
})

// ---------- utils: etiquetas, filtros y comparación de valores ----------

test('etiqueta busca el texto de una acción', () => {
  assert.equal(etiqueta(ACCIONES, 'CREACION'), 'Creación')
  assert.equal(etiqueta(ACCIONES, 'OTRA_COSA'), 'OTRA_COSA') // valor desconocido: se muestra tal cual
})

test('parametrosDesde arma el rango horario completo de "desde" y "hasta" y descarta lo vacío', () => {
  const resultado = parametrosDesde({ accion: '', tipoRegistro: '  ', registroId: '', actor: ' encargado ', desde: '2026-10-01', hasta: '2026-10-05' })
  assert.deepEqual(resultado, { actor: 'encargado', desde: '2026-10-01T00:00:00', hasta: '2026-10-05T23:59:59' })
})

test('rangoValido rechaza un rango invertido', () => {
  assert.equal(rangoValido({ desde: '2026-10-10', hasta: '2026-10-01' }), false)
  assert.equal(rangoValido({ desde: '2026-10-01', hasta: '2026-10-10' }), true)
  assert.equal(rangoValido({ desde: '', hasta: '' }), true)
})

test('diferenciasCampos marca solo los campos que cambiaron en una modificación', () => {
  const diferencias = diferenciasCampos(
    { nombre: 'Juan', activo: true, cuadrillaId: 1 },
    { nombre: 'Juan', activo: false, cuadrillaId: 1 },
  )
  const porCampo = Object.fromEntries(diferencias.map((d) => [d.campo, d]))
  assert.equal(porCampo.nombre.cambio, false)
  assert.equal(porCampo.activo.cambio, true)
  assert.equal(porCampo.cuadrillaId.cambio, false)
})

test('diferenciasCampos en una creación muestra todos los campos nuevos sin marcar cambio', () => {
  const diferencias = diferenciasCampos(null, { titulo: 'Poda plaza' })
  assert.deepEqual(diferencias, [{ campo: 'titulo', antes: undefined, despues: 'Poda plaza', cambio: false }])
})

test('formatearValorCampo da formato legible a null, booleanos y objetos', () => {
  assert.equal(formatearValorCampo(null), '—')
  assert.equal(formatearValorCampo(true), 'Sí')
  assert.equal(formatearValorCampo(false), 'No')
  assert.equal(formatearValorCampo('Poda'), 'Poda')
  assert.equal(formatearValorCampo({ id: 1 }), '{"id":1}')
})
