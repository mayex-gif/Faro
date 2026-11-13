import test from 'node:test'
import assert from 'node:assert/strict'
import { enviarCierre } from '../src/api/cierreOrden.js'

const COMANDA = '3f2a8c1e-0000-4000-8000-000000000009'
const AHORA = new Date('2026-11-13T18:00:00.000Z')

// fetch falso: contesta en orden lo que le digamos y anota qué se pidió (no sale a internet)
function fetchFalso(t, respuestas) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, opciones })
    const { status = 200, cuerpo = null } = respuestas[pedidos.length - 1] ?? {}
    return { ok: status >= 200 && status < 300, status, json: async () => cuerpo }
  })
  return pedidos
}

test('sin comentario, solo se manda el cambio de estado con los datos del cierre', async (t) => {
  const pedidos = fetchFalso(t, [{ cuerpo: { id: 7, estadoNombre: 'Finalizada' } }])

  const resultado = await enviarCierre(7, { cambio: { estadoId: 4, lugarFunciona: true, gastoAdicional: 8000 }, comentario: null })

  assert.equal(pedidos.length, 1)
  assert.equal(pedidos[0].url, '/api/ordenes-trabajo/7/estado')
  assert.equal(pedidos[0].opciones.method, 'PATCH')
  assert.deepEqual(JSON.parse(pedidos[0].opciones.body), { estadoId: 4, lugarFunciona: true, gastoAdicional: 8000 })
  assert.deepEqual(resultado, { orden: { id: 7, estadoNombre: 'Finalizada' }, comentario: null })
})

test('con comentario, primero va el comentario (con su número de comanda) y después el estado', async (t) => {
  const pedidos = fetchFalso(t, [{ cuerpo: { id: 30 } }, { cuerpo: { id: 7 } }])
  const foto = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })

  const resultado = await enviarCierre(7, {
    cambio: { estadoId: 4 }, comentario: { texto: 'Cambiamos la lámpara', fotos: [foto] }, numeroComentario: COMANDA,
  }, { ahora: AHORA })

  assert.equal(pedidos[0].url, `/api/ordenes-trabajo/7/comentarios/${COMANDA}`)
  assert.equal(pedidos[0].opciones.method, 'PUT')
  assert.equal(pedidos[0].opciones.body.get('texto'), 'Cambiamos la lámpara')
  assert.equal(pedidos[0].opciones.body.get('hechoEn'), '2026-11-13T18:00:00.000Z')
  assert.equal(pedidos[0].opciones.body.getAll('fotos').length, 1)
  assert.equal(pedidos[1].url, '/api/ordenes-trabajo/7/estado')
  assert.deepEqual(resultado, { orden: { id: 7 }, comentario: { id: 30 } })
})

test('si falla el comentario, la OT no se cierra y el error dice que falló el comentario', async (t) => {
  const pedidos = fetchFalso(t, [{ status: 413, cuerpo: { mensaje: 'Las fotos pesan demasiado' } }])

  await assert.rejects(
    enviarCierre(7, { cambio: { estadoId: 4 }, comentario: { texto: 'x', fotos: [] }, numeroComentario: COMANDA }),
    (error) => error.etapa === 'comentario' && error.estado === 413)
  assert.equal(pedidos.length, 1) // no se intentó cerrar la OT
})

test('si el comentario llegó pero falla el cambio de estado, el error dice que falló el estado', async (t) => {
  fetchFalso(t, [{ cuerpo: { id: 30 } }, { status: 409, cuerpo: { mensaje: 'No se puede pasar una orden de Pendiente a Finalizada' } }])

  await assert.rejects(
    enviarCierre(7, { cambio: { estadoId: 4 }, comentario: { texto: 'x', fotos: [] }, numeroComentario: COMANDA }),
    (error) => error.etapa === 'estado' && error.estado === 409 && error.conComentario === true
      && error.message === 'No se puede pasar una orden de Pendiente a Finalizada')
})
