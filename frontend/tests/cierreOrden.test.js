import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CANCELAR, FINALIZAR, MAX_MOTIVO, PREFIJO_MOTIVO, armarCancelacion, armarFinalizacion, avisoOtrasAbiertas,
  casillaDelLugar, esCancelacion, esFinalizacion, formatearPesos, hayErrores, otrasAbiertasDelLugar, popUpDelCambio,
  textoMontoDeclarado, validarGasto,
} from '../src/utils/cierreOrden.js'
import { MAX_TEXTO } from '../src/utils/comentarios.js'

const PENDIENTE = { id: 1, nombre: 'Pendiente', cierre: false }
const EN_CURSO = { id: 3, nombre: 'En curso', cierre: false }
const FINALIZADA = { id: 4, nombre: 'Finalizada', cierre: true }
const CANCELADA = { id: 5, nombre: 'Cancelada', cierre: true }
const ESTADOS = [PENDIENTE, EN_CURSO, FINALIZADA, CANCELADA]

const apagada = { id: 9, tipo: 'LUMINARIA', estadoOperativo: false, instalada: true }

// ===================== Qué pop-up abre cada botón =====================

test('finalizar abre el pop-up de Finalizar y cancelar el de Cancelar', () => {
  assert.equal(popUpDelCambio(FINALIZADA), FINALIZAR)
  assert.equal(popUpDelCambio(CANCELADA), CANCELAR)
  assert.equal(popUpDelCambio(EN_CURSO), null) // los demás estados no piden nada
  assert.equal(popUpDelCambio(null), null)
})

test('la cancelación se reconoce por el nombre (los estados son configurables)', () => {
  assert.equal(esCancelacion({ id: 8, nombre: '  cancelado por lluvia', cierre: true }), true)
  assert.equal(esCancelacion({ id: 8, nombre: 'Cancelar', cierre: false }), false) // si no cierra, no es cancelación
  assert.equal(esFinalizacion({ id: 9, nombre: 'Resuelta', cierre: true }), true)
  assert.equal(esFinalizacion(EN_CURSO), false)
})

// ===================== Otros trabajos abiertos en el mismo lugar =====================

test('cuenta los otros trabajos abiertos del lugar, sin contar esta OT ni las cerradas', () => {
  const esta = { id: 10, lugarId: 9, estadoId: 3 }
  const ordenes = [
    esta,
    { id: 11, lugarId: 9, estadoId: 1 },  // abierta, mismo lugar → cuenta
    { id: 12, lugarId: '9', estadoId: 3 }, // el id puede venir como texto → cuenta
    { id: 13, lugarId: 9, estadoId: 4 },  // finalizada → no
    { id: 14, lugarId: 9, estadoId: 5 },  // cancelada → no
    { id: 15, lugarId: 2, estadoId: 1 },  // otro lugar → no
  ]
  assert.equal(otrasAbiertasDelLugar(esta, ordenes, ESTADOS), 2)
  assert.equal(otrasAbiertasDelLugar(esta, [esta], ESTADOS), 0)
  assert.equal(otrasAbiertasDelLugar(null, ordenes, ESTADOS), 0)
})

test('el aviso de otros trabajos abiertos, en singular y en plural', () => {
  assert.equal(avisoOtrasAbiertas(0), '')
  assert.equal(avisoOtrasAbiertas(1), 'Este lugar tiene 1 trabajo abierto más')
  assert.equal(avisoOtrasAbiertas(3), 'Este lugar tiene 3 trabajos abiertos más')
})

// ===================== La casilla "El lugar quedó funcionando" =====================

test('un lugar fuera de servicio y sin otros trabajos: la casilla aparece marcada', () => {
  assert.deepEqual(casillaDelLugar(apagada, 0), { mostrar: true, marcada: true, aviso: '' })
  // Sirve para todos los tipos de lugar
  assert.equal(casillaDelLugar({ tipo: 'CALLE', estadoOperativo: false }, 0).mostrar, true)
  assert.equal(casillaDelLugar({ tipo: 'ESPACIO_VERDE', estadoOperativo: false }, 0).mostrar, true)
})

test('si el lugar tiene otros trabajos abiertos, la casilla viene desmarcada y con el aviso', () => {
  assert.deepEqual(casillaDelLugar(apagada, 2),
    { mostrar: true, marcada: false, aviso: 'Este lugar tiene 2 trabajos abiertos más' })
})

test('si el lugar ya funciona, no se sabe cómo está o es una luminaria a futuro, la casilla no aparece', () => {
  assert.deepEqual(casillaDelLugar({ ...apagada, estadoOperativo: true }, 3), { mostrar: false, marcada: false, aviso: '' })
  assert.equal(casillaDelLugar(null, 0).mostrar, false)
  assert.equal(casillaDelLugar({ ...apagada, estadoOperativo: null }, 0).mostrar, false)
  assert.equal(casillaDelLugar({ ...apagada, instalada: false }, 0).mostrar, false)
})

// ===================== Monto declarado y gasto adicional =====================

test('el monto declarado se muestra en pesos, o se avisa que no se declaró', () => {
  assert.equal(textoMontoDeclarado(12000), 'Monto aproximado declarado: $ 12.000')
  assert.equal(textoMontoDeclarado(8000.5), 'Monto aproximado declarado: $ 8.000,50')
  assert.equal(textoMontoDeclarado(0), 'Monto aproximado declarado: $ 0')
  assert.equal(textoMontoDeclarado(null), 'No se declaró un monto')
  assert.equal(textoMontoDeclarado(undefined), 'No se declaró un monto')
  assert.equal(formatearPesos(1234567.891), '$ 1.234.567,89')
})

test('el gasto adicional vacío es válido: no hubo otro gasto', () => {
  assert.deepEqual(validarGasto(''), { valor: null, error: null })
  assert.deepEqual(validarGasto('   '), { valor: null, error: null })
  assert.deepEqual(validarGasto(undefined), { valor: null, error: null })
})

test('el gasto adicional acepta enteros y hasta 2 decimales, con punto o con coma', () => {
  assert.deepEqual(validarGasto('8000'), { valor: 8000, error: null })
  assert.deepEqual(validarGasto(' 8000,5 '), { valor: 8000.5, error: null })
  assert.deepEqual(validarGasto('8000.50'), { valor: 8000.5, error: null })
  assert.deepEqual(validarGasto('0'), { valor: 0, error: null })
  assert.deepEqual(validarGasto(1500), { valor: 1500, error: null }) // por si llega como número
})

test('el gasto adicional rechaza negativos, más de 2 decimales, puntos de miles y letras', () => {
  assert.equal(validarGasto('-1').error, 'El gasto no puede ser negativo.')
  assert.equal(validarGasto('10,555').error, 'Escribí el monto con hasta 2 decimales (ej: 8000 o 8000,50).')
  assert.equal(validarGasto('8.000').error, 'Escribí solo el número, sin puntos de miles (ej: 8000 o 8000,50).')
  assert.equal(validarGasto('$ 500').error, 'Escribí solo el número, sin puntos de miles (ej: 8000 o 8000,50).')
  assert.equal(validarGasto('1234567890123').error, 'El monto es demasiado grande.') // 13 enteros
  assert.deepEqual(validarGasto('999999999999,99'), { valor: 999999999999.99, error: null }) // 12 enteros: entra
  assert.equal(validarGasto('-1').valor, null)
})

// ===================== Lo que se manda al finalizar =====================

const marcada = casillaDelLugar(apagada, 0)

test('finalizar con todo vacío anda: solo viaja el estado nuevo', () => {
  const sinCasilla = casillaDelLugar({ ...apagada, estadoOperativo: true }, 0)
  assert.deepEqual(armarFinalizacion(FINALIZADA, { casilla: sinCasilla }),
    { errores: {}, comentario: null, cambio: { estadoId: 4 } })
  assert.deepEqual(armarFinalizacion(FINALIZADA), { errores: {}, comentario: null, cambio: { estadoId: 4 } })
})

test('finalizar con la casilla, el gasto, un comentario y fotos', () => {
  const foto = { nombre: 'foto.jpg' }
  const armado = armarFinalizacion(FINALIZADA, {
    casilla: marcada, lugarFunciona: true, gasto: '8000,50', comentario: '  Cambiamos la lámpara  ', fotos: [foto],
  })
  assert.deepEqual(armado.errores, {})
  assert.deepEqual(armado.cambio, { estadoId: 4, lugarFunciona: true, gastoAdicional: 8000.5 })
  assert.deepEqual(armado.comentario, { texto: 'Cambiamos la lámpara', fotos: [foto] })
})

test('si la casilla aparece y la desmarcan, viaja lugarFunciona: false (el lugar queda como está)', () => {
  const desmarcada = casillaDelLugar(apagada, 1)
  assert.deepEqual(armarFinalizacion(FINALIZADA, { casilla: desmarcada, lugarFunciona: false }).cambio,
    { estadoId: 4, lugarFunciona: false })
})

test('si la casilla no aparece, no viaja (el backend hace lo de siempre)', () => {
  const sinCasilla = casillaDelLugar(null, 0)
  assert.equal('lugarFunciona' in armarFinalizacion(FINALIZADA, { casilla: sinCasilla, lugarFunciona: true }).cambio, false)
})

test('solo fotos, sin texto, también es un comentario de evidencia', () => {
  const fotos = [{ n: 1 }, { n: 2 }]
  assert.deepEqual(armarFinalizacion(FINALIZADA, { fotos }).comentario, { texto: '', fotos })
})

test('con un gasto mal escrito o un comentario muy largo hay errores y no se manda nada', () => {
  const armado = armarFinalizacion(FINALIZADA, { gasto: '-5', comentario: 'x'.repeat(MAX_TEXTO + 1) })
  assert.equal(hayErrores(armado.errores), true)
  assert.equal(armado.errores.gasto, 'El gasto no puede ser negativo.')
  assert.equal(armado.errores.comentario, `El comentario puede tener hasta ${MAX_TEXTO} caracteres.`)
  assert.equal(armado.comentario, null)
  assert.equal(hayErrores({}), false)
})

test('más de 5 fotos es un error', () => {
  const armado = armarFinalizacion(FINALIZADA, { fotos: [1, 2, 3, 4, 5, 6] })
  assert.equal(armado.errores.comentario, 'Se pueden agregar hasta 5 fotos.')
})

// ===================== Lo que se manda al cancelar =====================

test('cancelar sin motivo: solo viaja el estado nuevo', () => {
  assert.deepEqual(armarCancelacion(CANCELADA, '   '), { errores: {}, comentario: null, cambio: { estadoId: 5 } })
  assert.deepEqual(armarCancelacion(CANCELADA), { errores: {}, comentario: null, cambio: { estadoId: 5 } })
})

test('cancelar con motivo: va como comentario "Motivo de la cancelación: …"', () => {
  assert.deepEqual(armarCancelacion(CANCELADA, ' Lo arregló la cooperativa '), {
    errores: {},
    comentario: { texto: 'Motivo de la cancelación: Lo arregló la cooperativa', fotos: [] },
    cambio: { estadoId: 5 },
  })
})

test('el motivo entra entero en un comentario (con el "Motivo de la cancelación: " adelante)', () => {
  assert.equal(PREFIJO_MOTIVO.length + MAX_MOTIVO, MAX_TEXTO)
  assert.deepEqual(armarCancelacion(CANCELADA, 'x'.repeat(MAX_MOTIVO)).errores, {})
  const largo = armarCancelacion(CANCELADA, 'x'.repeat(MAX_MOTIVO + 1))
  assert.equal(largo.errores.motivo, `El motivo puede tener hasta ${MAX_MOTIVO} caracteres.`)
  assert.equal(largo.comentario, null)
})
