import test from 'node:test'
import assert from 'node:assert/strict'
import { bajarFoto, borrarComentario, formularioDeComentario, listarComentarios, publicarComentario } from '../src/api/comentarios.js'
import { ErrorApi } from '../src/api/cliente.js'
import { enviarOperacion } from '../src/api/sincronizacion.js'
import { crearComentario, crearCambioEstado } from '../src/offline/datosCola.js'
import {
  MAX_FOTOS, MAX_TEXTO, contadorTexto, descripcionFoto, fechaComentario, fotosQueQuedan, mensajeDeError, puedeComentar,
  sacarDelMuro, sumarAlMuro, textoCantidad, validarComentario,
} from '../src/utils/comentarios.js'

// fetch falso: anota qué se pidió y contesta lo que le digamos (no sale a internet)
function fetchFalso(t, { status = 200, cuerpo = null, blob = null } = {}) {
  const pedidos = []
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    pedidos.push({ url, opciones })
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (cuerpo === null) throw new SyntaxError('sin JSON')
        return cuerpo
      },
      blob: async () => blob,
    }
  })
  return pedidos
}

const COMANDA = '3f2a8c1e-0000-4000-8000-000000000001'
const encargado = { activo: true, rol: 'ENCARGADO_CORRALON' }
const mesa = { activo: true, rol: 'MESA_ENTRADAS' }
const capatazVerde = { activo: true, rol: 'CAPATAZ_CUADRILLA', cuadrillaId: 1 }

// ===================== api =====================

test('listarComentarios pide el muro de la OT', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: [{ id: 4 }] })

  const muro = await listarComentarios(7)

  assert.equal(pedidos[0].url, '/api/ordenes-trabajo/7/comentarios')
  assert.deepEqual(muro, [{ id: 4 }])
})

test('publicarComentario manda un PUT con el número de comanda y un formulario, sin Content-Type', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { id: 4 } })
  const foto = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })

  await publicarComentario(7, COMANDA, { texto: '  Listo  ', fotos: [foto], hechoEn: '2026-11-08T13:15:00.000Z' })

  const { url, opciones } = pedidos[0]
  assert.equal(url, `/api/ordenes-trabajo/7/comentarios/${COMANDA}`)
  assert.equal(opciones.method, 'PUT')
  assert.ok(opciones.body instanceof FormData)
  assert.equal(opciones.headers['Content-Type'], undefined) // lo pone el navegador, con el separador
  assert.equal(opciones.body.get('texto'), 'Listo')
  assert.equal(opciones.body.get('hechoEn'), '2026-11-08T13:15:00.000Z')
  assert.equal(opciones.body.getAll('fotos').length, 1)
  assert.equal(opciones.body.get('fotos').name, 'foto-1.jpg')
})

test('formularioDeComentario no manda texto vacío y numera las fotos', () => {
  const fotos = [new Blob(['a']), new Blob(['b'])]

  const formulario = formularioDeComentario({ texto: '   ', fotos, hechoEn: new Date('2026-11-08T13:15:00Z') })

  assert.equal(formulario.has('texto'), false)
  assert.deepEqual(formulario.getAll('fotos').map((f) => f.name), ['foto-1.jpg', 'foto-2.jpg'])
})

test('si el backend rechaza el comentario, llega el motivo como ErrorApi', async (t) => {
  fetchFalso(t, { status: 409, cuerpo: { estado: 409, mensaje: 'Esta orden ya no es de tu cuadrilla', errores: { motivo: 'OTRA_CUADRILLA' } } })

  await assert.rejects(publicarComentario(7, COMANDA, { texto: 'Hola' }), (error) => {
    assert.ok(error instanceof ErrorApi)
    assert.equal(error.estado, 409)
    assert.equal(error.errores.motivo, 'OTRA_CUADRILLA')
    return true
  })
})

test('bajarFoto devuelve los bytes de la foto (un Blob) y manda la sesión', async (t) => {
  const bytes = new Blob(['foto'], { type: 'image/jpeg' })
  const pedidos = fetchFalso(t, { blob: bytes })

  const foto = await bajarFoto(12)

  assert.equal(pedidos[0].url, '/api/comentarios/fotos/12')
  assert.equal(foto, bytes)
})

test('bajarFoto de una OT ajena lanza ErrorApi 403', async (t) => {
  fetchFalso(t, { status: 403, cuerpo: { estado: 403, mensaje: 'Esta orden no es de tu cuadrilla', errores: {} } })

  await assert.rejects(bajarFoto(12), (error) => error instanceof ErrorApi && error.estado === 403)
})

test('borrarComentario manda un DELETE y no espera datos (204)', async (t) => {
  const pedidos = fetchFalso(t, { status: 204 })

  const respuesta = await borrarComentario(4)

  assert.equal(pedidos[0].url, '/api/comentarios/4')
  assert.equal(pedidos[0].opciones.method, 'DELETE')
  assert.equal(respuesta, null)
})

// ===================== reglas =====================

test('puedeComentar: encargado y mesa en todas; el capataz solo en las de su cuadrilla', () => {
  const ordenVerde = { id: 7, cuadrillaId: 1 }
  const ordenAlumbrado = { id: 8, cuadrillaId: 2 }
  const sinCuadrilla = { id: 9, cuadrillaId: null }

  assert.equal(puedeComentar(encargado, ordenAlumbrado), true)
  assert.equal(puedeComentar(mesa, sinCuadrilla), true)
  assert.equal(puedeComentar(capatazVerde, ordenVerde), true)
  assert.equal(puedeComentar(capatazVerde, { id: 7, cuadrillaId: '1' }), true) // a veces llega como texto
  assert.equal(puedeComentar(capatazVerde, ordenAlumbrado), false)
  assert.equal(puedeComentar(capatazVerde, sinCuadrilla), false)
  assert.equal(puedeComentar({ ...capatazVerde, cuadrillaId: null }, ordenVerde), false)
  assert.equal(puedeComentar({ ...encargado, activo: false }, ordenVerde), false)
  assert.equal(puedeComentar({ activo: true, rol: 'OTRO' }, ordenVerde), false)
  assert.equal(puedeComentar(encargado, null), false)
  assert.equal(puedeComentar(null, ordenVerde), false)
})

test('validarComentario pide texto o foto y respeta los límites', () => {
  const foto = {}
  assert.equal(validarComentario({ texto: '  ', fotos: [] }), 'Escribí un comentario o agregá al menos una foto')
  assert.equal(validarComentario(), 'Escribí un comentario o agregá al menos una foto')
  assert.equal(validarComentario({ texto: 'Hola' }), null)
  assert.equal(validarComentario({ fotos: [foto] }), null)
  assert.equal(validarComentario({ texto: 'a'.repeat(MAX_TEXTO) }), null)
  assert.equal(validarComentario({ texto: 'a'.repeat(MAX_TEXTO + 1) }), 'El comentario puede tener hasta 1000 caracteres')
  assert.equal(validarComentario({ fotos: Array(MAX_FOTOS + 1).fill(foto) }), 'Se pueden agregar hasta 5 fotos')
})

test('fotosQueQuedan, contadorTexto y textoCantidad', () => {
  assert.equal(fotosQueQuedan(0), 5)
  assert.equal(fotosQueQuedan(3), 2)
  assert.equal(fotosQueQuedan(7), 0)
  assert.equal(contadorTexto('  hola  '), '4 / 1000')
  assert.equal(contadorTexto(), '0 / 1000')
  assert.equal(textoCantidad(0), 'Sin comentarios')
  assert.equal(textoCantidad(undefined), 'Sin comentarios')
  assert.equal(textoCantidad(1), '1 comentario')
  assert.equal(textoCantidad(3), '3 comentarios')
})

test('fechaComentario dice cuándo, en corto y en hora de Argentina', () => {
  const ahora = new Date('2026-11-08T19:00:00Z') // 16:00 en Argentina
  assert.equal(fechaComentario('2026-11-08T18:59:40Z', ahora), 'recién')
  assert.equal(fechaComentario('2026-11-08T18:55:00Z', ahora), 'hace 5 min')
  assert.equal(fechaComentario('2026-11-08T13:15:00Z', ahora), 'hoy 10:15')
  assert.equal(fechaComentario('2026-11-07T13:15:00Z', ahora), 'ayer 10:15')
  assert.equal(fechaComentario('2026-10-30T13:15:00-03:00', ahora), '30/10/26 13:15')
  assert.equal(fechaComentario(null, ahora), '')
})

test('mensajeDeError explica qué pasó', () => {
  assert.equal(mensajeDeError(new TypeError('Failed to fetch')), 'No hay conexión con el servidor. Probá de nuevo en un rato.')
  assert.equal(mensajeDeError(new ErrorApi(413, 'x')), 'Las fotos pesan demasiado. Probá con menos fotos.')
  assert.equal(mensajeDeError(new ErrorApi(403, 'Esta orden no es de tu cuadrilla')), 'Esta orden no es de tu cuadrilla')
  assert.equal(mensajeDeError(new Error('No se pudo abrir esa foto. Probá con otra (JPG o PNG).')), 'No se pudo abrir esa foto. Probá con otra (JPG o PNG).')
  assert.equal(mensajeDeError(new ErrorApi(500, '')), 'No se pudo completar. Probá de nuevo.')
  assert.equal(mensajeDeError(null), '')
})

test('sumarAlMuro pone el nuevo primero y no lo repite si ya estaba (reintento)', () => {
  const muro = [{ id: 2 }, { id: 1 }]
  assert.deepEqual(sumarAlMuro(muro, { id: 3 }).map((c) => c.id), [3, 2, 1])
  assert.deepEqual(sumarAlMuro(muro, { id: 2, texto: 'otra vez' }).map((c) => c.id), [2, 1])
  assert.deepEqual(muro.map((c) => c.id), [2, 1]) // no cambia el muro original
})

test('sacarDelMuro quita el comentario borrado', () => {
  assert.deepEqual(sacarDelMuro([{ id: 2 }, { id: 1 }], 2), [{ id: 1 }])
  assert.deepEqual(sacarDelMuro([{ id: 1 }], 9), [{ id: 1 }])
})

test('descripcionFoto arma el texto para lectores de pantalla', () => {
  const comentario = { autorNombre: 'Carlos Rodríguez', fotos: [{}, {}, {}] }
  assert.equal(descripcionFoto(comentario, 1), 'Foto 2 de 3 del comentario de Carlos Rodríguez')
})

test('el cartero manda un comentario del cuaderno por el PUT de siempre, como formulario', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { id: 9 } })
  const foto = new Blob(['jpeg'], { type: 'image/jpeg' })
  const operacion = crearComentario({ id: 5 }, { id: 7 }, { texto: 'Sin señal', fotos: [foto] }, { numero: COMANDA })

  await enviarOperacion(operacion)

  assert.equal(pedidos[0].url, `/api/ordenes-trabajo/7/comentarios/${COMANDA}`)
  assert.equal(pedidos[0].opciones.method, 'PUT')
  assert.equal(pedidos[0].opciones.headers['Content-Type'], undefined)
  assert.equal(pedidos[0].opciones.body.get('texto'), 'Sin señal')
  assert.equal(pedidos[0].opciones.body.getAll('fotos').length, 1)
})

test('los cambios de estado del cuaderno siguen yendo como JSON a /sincronizacion', async (t) => {
  const pedidos = fetchFalso(t, { cuerpo: { id: 7 } })
  const operacion = crearCambioEstado({ id: 5 }, { id: 7, estadoId: 2 }, { id: 3, nombre: 'En curso' }, { numero: 'a' })

  await enviarOperacion(operacion)

  assert.equal(pedidos[0].url, '/api/sincronizacion/cambios-estado/a')
  assert.equal(pedidos[0].opciones.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(pedidos[0].opciones.body).estadoId, 3)
})
