import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  callesQueLimitan,
  cortar,
  crucesDe,
  distanciasDelTramo,
  entreCallesDe,
  esTodaLaCalle,
  largoDe,
  pedidoDeTramo,
  pegarAEsquina,
  proyectar,
  puntoEn,
  textoDePunto,
  textoTramo,
  tocarTramo,
  tramoEntre,
} from '../src/utils/tramos.js'

// ===== Un barrio inventado, dibujado en metros alrededor de la plaza =====
// Buenos Aires va de oeste (x=0) a este (x=400). La cruzan:
//   Catamarca en x=100 (comparte el vértice, como las calles de OpenStreetMap)
//   La Rioja en x=200 (dibujada a mano: no comparte coordenadas)
//   Jujuy en x=300: viene del norte y termina 5 m antes (esquina en "T")
//   Ituzaingó en x=380
// Lejana es paralela a 50 m (no la cruza). Herradura la cruza dos veces (x=40 y x=60).
const LAT0 = -31.134
const LNG0 = -64.14
const M_POR_GRADO = 6371000 * Math.PI / 180
const enGrados = (x, y) => [LNG0 + x / (M_POR_GRADO * Math.cos(LAT0 * Math.PI / 180)), LAT0 + y / M_POR_GRADO]
const calle = (id, nombre, ...puntos) => ({
  id, nombre, tipo: 'CALLE', ubicacion: { type: 'LineString', coordinates: puntos.map(([x, y]) => enGrados(x, y)) },
})

const buenosAires = calle(1, 'Buenos Aires', [0, 0], [100, 0], [400, 0])
const catamarca = calle(2, 'Catamarca', [100, 150], [100, 0], [100, -150])
const laRioja = calle(3, 'La Rioja', [201, 120], [199, -120])
const jujuy = calle(4, 'Jujuy', [300, 150], [300, 5])
const ituzaingo = calle(5, 'Ituzaingó', [380, 100], [380, -100])
const lejana = calle(6, 'Lejana', [0, 50], [400, 50])
const herradura = calle(7, 'Herradura', [40, 80], [40, -30], [60, -30], [60, 80])
const repetida = calle(8, 'buenos aires', [0, 1], [400, 1]) // la misma calle cargada dos veces
const todas = [buenosAires, catamarca, laRioja, jujuy, ituzaingo, lejana, herradura, repetida]

const cerca = (real, esperado, margen = 1) =>
  assert.ok(Math.abs(real - esperado) <= margen, `esperaba ~${esperado} y dio ${real}`)
const nombres = (cruces) => cruces.map((c) => c.calle.nombre)

const cruces = crucesDe(buenosAires, todas)
const esquina = (nombre) => cruces.find((c) => c.calle.nombre === nombre)

test('largoDe mide la calle en metros', () => {
  cerca(largoDe(buenosAires), 400)
  cerca(largoDe(buenosAires.ubicacion), 400)
  assert.equal(largoDe({ ubicacion: { type: 'Point', coordinates: [0, 0] } }), 0)
})

test('crucesDe encuentra las esquinas ordenadas a lo largo de la calle', () => {
  assert.deepEqual(nombres(cruces), ['Herradura', 'Herradura', 'Catamarca', 'La Rioja', 'Jujuy', 'Ituzaingó'])
  cerca(esquina('Catamarca').distancia, 100)
  cerca(esquina('La Rioja').distancia, 200)
  cerca(esquina('Ituzaingó').distancia, 380)
})

test('crucesDe: la esquina en "T" (termina a 5 m) cuenta como cruce, una paralela a 50 m no', () => {
  cerca(esquina('Jujuy').distancia, 300)
  assert.equal(esquina('Lejana'), undefined)
  // con menos tolerancia, la "T" a 5 m ya no cuenta
  assert.equal(crucesDe(buenosAires, todas, 3).some((c) => c.calle.nombre === 'Jujuy'), false)
})

test('crucesDe: una calle que cruza dos veces aparece dos veces; la misma calle (mismo nombre) no se cruza consigo misma', () => {
  const herraduras = cruces.filter((c) => c.calle.nombre === 'Herradura')
  cerca(herraduras[0].distancia, 40)
  cerca(herraduras[1].distancia, 60)
  assert.equal(cruces.some((c) => c.calle.id === 8), false)
})

test('crucesDe: cada esquina trae el punto [long, lat] donde está', () => {
  const [lng, lat] = esquina('Catamarca').punto
  const [lngEsperada, latEsperada] = enGrados(100, 0)
  cerca(lng, lngEsperada, 1e-5)
  cerca(lat, latEsperada, 1e-5)
})

test('crucesDe: calle sin geometría o sin cruces devuelve una lista vacía', () => {
  assert.deepEqual(crucesDe({ nombre: 'Sin dibujo' }, todas), [])
  assert.deepEqual(crucesDe(lejana, [lejana, buenosAires]), [])
})

test('proyectar lleva el toque a la calle y dice a cuántos metros estaba', () => {
  const tocado = proyectar(enGrados(150, 12), buenosAires)
  cerca(tocado.distancia, 150)
  cerca(tocado.separacion, 12)
  cerca(tocado.punto[1], LAT0, 1e-6)
  // un toque antes del comienzo queda en el comienzo
  cerca(proyectar(enGrados(-30, 0), buenosAires).distancia, 0)
  assert.equal(proyectar(enGrados(0, 0), { ubicacion: null }), null)
})

test('puntoEn devuelve el punto a tantos metros del inicio (y no se pasa de las puntas)', () => {
  cerca(proyectar(puntoEn(buenosAires, 250), buenosAires).distancia, 250)
  assert.deepEqual(puntoEn(buenosAires, 9999), buenosAires.ubicacion.coordinates[2].map((v) => Math.round(v * 1e6) / 1e6))
})

test('pegarAEsquina pega a la esquina si el toque cae a 15 m o menos', () => {
  const pegado = pegarAEsquina(110, cruces)
  cerca(pegado.distancia, 100)
  assert.equal(pegado.esquina.calle.nombre, 'Catamarca')
  const suelto = pegarAEsquina(150, cruces)
  assert.equal(suelto.distancia, 150)
  assert.equal(suelto.esquina, null)
  assert.equal(pegarAEsquina(192, cruces).esquina.calle.nombre, 'La Rioja')
})

test('cortar arma el tramo en cualquier orden, con los vértices del medio y 6 decimales', () => {
  const tramo = cortar(buenosAires, 250, 50)
  assert.equal(tramo.type, 'LineString')
  assert.equal(tramo.coordinates.length, 3) // inicio, el vértice de Catamarca (x=100) y fin
  const { desde, hasta } = distanciasDelTramo(buenosAires, tramo)
  cerca(desde, 50)
  cerca(hasta, 250)
  for (const [lng, lat] of tramo.coordinates) {
    assert.equal(lng, Math.round(lng * 1e6) / 1e6)
    assert.equal(lat, Math.round(lat * 1e6) / 1e6)
  }
  assert.equal(cortar(buenosAires, 120, 120), null)
  assert.equal(cortar({ ubicacion: null }, 0, 10), null)
})

test('callesQueLimitan: tramo de esquina a esquina → solo esas dos y las del medio', () => {
  assert.deepEqual(nombres(callesQueLimitan(cruces, esquina('Catamarca').distancia, esquina('Jujuy').distancia)),
    ['Catamarca', 'La Rioja', 'Jujuy'])
})

test('callesQueLimitan: desde la mitad de la cuadra suma la esquina anterior (no otras)', () => {
  // desde la mitad entre Catamarca y La Rioja hasta Jujuy
  assert.deepEqual(nombres(callesQueLimitan(cruces, 150, esquina('Jujuy').distancia)), ['Catamarca', 'La Rioja', 'Jujuy'])
  // hasta la mitad entre La Rioja y Jujuy, al revés
  assert.deepEqual(nombres(callesQueLimitan(cruces, 250, esquina('Catamarca').distancia)), ['Catamarca', 'La Rioja', 'Jujuy'])
  // dentro de una sola cuadra
  assert.deepEqual(nombres(callesQueLimitan(cruces, 130, 170)), ['Catamarca', 'La Rioja'])
  // una calle que cruza dos veces se ofrece una sola vez
  assert.deepEqual(nombres(callesQueLimitan(cruces, 30, 90)), ['Herradura', 'Catamarca'])
})

test('entreCallesDe toma la primera y la última calle del tramo', () => {
  assert.deepEqual(entreCallesDe(callesQueLimitan(cruces, 150, 300)), { calleEntre1: 'Catamarca', calleEntre2: 'Jujuy' })
  assert.deepEqual(entreCallesDe([esquina('Catamarca')]), { calleEntre1: '', calleEntre2: '' })
})

test('tramoEntre arma el tramo con dos calles elegidas en el formulario', () => {
  const tramo = tramoEntre(buenosAires, cruces, 'la rioja', 'Catamarca') // sin importar mayúsculas ni el orden
  const { desde, hasta } = distanciasDelTramo(buenosAires, tramo)
  cerca(desde, 100)
  cerca(hasta, 200)
  // Herradura cruza dos veces: usa la esquina más cercana a Catamarca (x=60)
  cerca(distanciasDelTramo(buenosAires, tramoEntre(buenosAires, cruces, 'Herradura', 'Catamarca')).desde, 60)
  assert.equal(tramoEntre(buenosAires, cruces, 'Catamarca', 'Lejana'), null)
  assert.equal(tramoEntre(buenosAires, cruces, 'Catamarca', 'Catamarca'), null)
  assert.equal(tramoEntre(buenosAires, cruces, '', 'Catamarca'), null)
})

test('esTodaLaCalle: sin tramo o de punta a punta', () => {
  assert.equal(esTodaLaCalle(buenosAires, null), true)
  assert.equal(esTodaLaCalle(buenosAires, cortar(buenosAires, 0, 400)), true)
  assert.equal(esTodaLaCalle(buenosAires, cortar(buenosAires, 0, 300)), false)
})

test('textoTramo describe el tramo para la ficha y la historia', () => {
  const texto = (desde, hasta) => textoTramo(buenosAires, cruces, cortar(buenosAires, desde, hasta))
  assert.equal(textoTramo(buenosAires, cruces, null), 'Buenos Aires, toda la calle')
  assert.equal(texto(100, 200), 'Buenos Aires, entre Catamarca y La Rioja')
  assert.equal(texto(150, 300), 'Buenos Aires, desde mitad de cuadra (entre Catamarca y La Rioja) hasta Jujuy')
  assert.equal(texto(300, 350), 'Buenos Aires, desde Jujuy hasta mitad de cuadra (entre Jujuy e Ituzaingó)')
  assert.equal(texto(120, 170), 'Buenos Aires, parte de la cuadra entre Catamarca y La Rioja')
  assert.equal(texto(0, 100), 'Buenos Aires, desde el comienzo de la calle hasta Catamarca')
  assert.equal(texto(390, 395), 'Buenos Aires, parte de la cuadra pasando Ituzaingó')
})

test('textoDePunto describe un solo punto (para "Desde" y "Hasta" mientras se marca)', () => {
  assert.equal(textoDePunto(buenosAires, cruces, 100), 'Catamarca')
  assert.equal(textoDePunto(buenosAires, cruces, 150), 'mitad de cuadra (entre Catamarca y La Rioja)')
  assert.equal(textoDePunto(buenosAires, cruces, 0), 'el comienzo de la calle')
  assert.equal(textoDePunto(lejana, [], 200), 'mitad de cuadra')
})

test('tocarTramo: primer toque = inicio, segundo = fin, cerca de una esquina se pega', () => {
  const uno = tocarTramo(buenosAires, cruces, [], enGrados(110, 6)) // a 10 m de Catamarca y 6 m de la calle
  assert.equal(uno.aviso, '')
  assert.equal(uno.toques[0].esquina, 'Catamarca')
  cerca(uno.toques[0].distancia, 100)
  const dos = tocarTramo(buenosAires, cruces, uno.toques, enGrados(250, -3)) // mitad de cuadra
  assert.equal(dos.toques.length, 2)
  assert.equal(dos.toques[1].esquina, null)
  cerca(dos.toques[1].distancia, 250)
})

test('tocarTramo: lejos de la calle no cuenta; el fin no puede ser el inicio; un tercer toque empieza de nuevo', () => {
  const lejos = tocarTramo(buenosAires, cruces, [], enGrados(150, 40))
  assert.deepEqual(lejos.toques, [])
  assert.equal(lejos.aviso, 'Tocá sobre Buenos Aires (la calle resaltada).')
  const inicio = tocarTramo(buenosAires, cruces, [], enGrados(100, 0)).toques
  const igual = tocarTramo(buenosAires, cruces, inicio, enGrados(105, 0)) // se pega a la misma esquina
  assert.equal(igual.toques.length, 1)
  assert.equal(igual.aviso, 'El final tiene que estar en otro lugar de la calle.')
  const dos = tocarTramo(buenosAires, cruces, inicio, enGrados(200, 0)).toques
  const tres = tocarTramo(buenosAires, cruces, dos, enGrados(300, 0))
  assert.equal(tres.toques.length, 1)
  assert.equal(tres.toques[0].esquina, 'Jujuy')
  assert.match(tres.aviso, /Empezaste otra vez/)
})

test('pedidoDeTramo arma lo que recibe el formulario de OT', () => {
  const esquinaA = { distancia: esquina('Catamarca').distancia, esquina: 'Catamarca' }
  assert.equal(pedidoDeTramo(buenosAires, cruces, [esquinaA]), null)
  const pedido = pedidoDeTramo(buenosAires, cruces, [{ distancia: 250, esquina: null }, esquinaA]) // al revés
  assert.equal(pedido.tramo.type, 'LineString')
  assert.equal(pedido.calleEntre1, 'Catamarca')
  assert.equal(pedido.calleEntre2, 'Jujuy')
  assert.equal(pedido.texto, 'Buenos Aires, desde Catamarca hasta mitad de cuadra (entre La Rioja y Jujuy)')
  // de punta a punta = toda la calle
  assert.deepEqual(pedidoDeTramo(buenosAires, cruces, [{ distancia: 0 }, { distancia: 400 }]),
    { tramo: null, calleEntre1: '', calleEntre2: '', texto: 'Buenos Aires, toda la calle' })
})

// ===== Con las calles reales del pueblo (las 24 que carga el backend desde OpenStreetMap) =====
const geojson = JSON.parse(fs.readFileSync(
  new URL('../../backend/src/main/resources/datos/calles-estacion-general-paz.geojson', import.meta.url)))
const delPueblo = geojson.features.map((f, i) => ({ id: i + 1, nombre: f.properties.nombre, tipo: 'CALLE', ubicacion: f.geometry }))
const llamada = (nombre) => delPueblo.find((c) => c.nombre === nombre)

test('calles reales: Buenos Aires tiene sus 10 esquinas en orden', () => {
  assert.deepEqual(nombres(crucesDe(llamada('Buenos Aires'), delPueblo)), ['Salta', 'La Rioja', 'Catamarca',
    'Santiago del Estero', 'Córdoba', 'Misiones', 'Formosa', 'San Juan', 'Mendoza', 'Santa Cruz'])
})

test('calles reales: Salta (en diagonal) cruza las calles que corta', () => {
  assert.deepEqual(nombres(crucesDe(llamada('Salta'), delPueblo)),
    ['Buenos Aires', 'Santa Fe', 'La Rioja', 'San Luis', 'Catamarca', 'La Pampa'])
})

test('calles reales: Buenos Aires entre Catamarca y La Rioja (el mismo tramo que calcula PostGIS)', () => {
  const ba = llamada('Buenos Aires')
  const esquinas = crucesDe(ba, delPueblo)
  const tramo = tramoEntre(ba, esquinas, 'Catamarca', 'La Rioja')
  assert.deepEqual(tramo, { type: 'LineString', coordinates: [[-64.14011, -31.131628], [-64.14033, -31.132688]] })
  assert.equal(textoTramo(ba, esquinas, tramo), 'Buenos Aires, entre La Rioja y Catamarca')
  // un toque a 10 m de la esquina con Córdoba se pega a Córdoba
  const cordoba = esquinas.find((c) => c.calle.nombre === 'Córdoba')
  assert.equal(pegarAEsquina(cordoba.distancia + 10, esquinas).esquina.calle.nombre, 'Córdoba')
})
