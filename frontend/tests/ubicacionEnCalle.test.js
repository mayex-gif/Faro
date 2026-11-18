import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MODOS_UBICACION,
  callesOfrecidas,
  crucesDeLaCalle,
  pedidoDeUbicacion,
  ubicacionInicial,
  validarUbicacion,
} from '../src/utils/ubicacionEnCalle.js'
import { cortar, distanciasDelTramo } from '../src/utils/tramos.js'

// Barrio inventado (en metros): Buenos Aires de x=0 a x=400, cruzada por Catamarca (100), La Rioja (200) y Jujuy (300).
// Lejana no cruza con nadie. La plaza no es una calle.
const LAT0 = -31.134
const M = 6371000 * Math.PI / 180
const g = (x, y) => [-64.14 + x / (M * Math.cos(LAT0 * Math.PI / 180)), LAT0 + y / M]
const calle = (id, nombre, ...puntos) => ({ id, nombre, tipo: 'CALLE', ubicacion: { type: 'LineString', coordinates: puntos.map(([x, y]) => g(x, y)) } })
const buenosAires = calle(1, 'Buenos Aires', [0, 0], [400, 0])
const lejana = calle(5, 'Lejana', [0, 500], [400, 500])
const plaza = { id: 9, nombre: 'Plaza', tipo: 'ESPACIO_VERDE', ubicacion: { type: 'Point', coordinates: g(50, 50) } }
const lugares = [buenosAires, calle(2, 'Catamarca', [100, 100], [100, -100]), calle(3, 'La Rioja', [200, 100], [200, -100]),
  calle(4, 'Jujuy', [300, 100], [300, -100]), lejana, plaza]
const cruces = crucesDeLaCalle(buenosAires, lugares)
const cerca = (real, esperado) => assert.ok(Math.abs(real - esperado) <= 1, `esperaba ~${esperado} y dio ${real}`)
const datos = (cambios) => ({ modoUbicacion: 'NINGUNA', calleEntre1: '', calleEntre2: '', altura: '', tramo: null, ...cambios })

test('crucesDeLaCalle: las esquinas con las otras calles (no con lugares que no son calles)', () => {
  assert.deepEqual(cruces.map((c) => c.calle.nombre), ['Catamarca', 'La Rioja', 'Jujuy'])
  assert.deepEqual(crucesDeLaCalle(plaza, lugares), [])
  assert.deepEqual(crucesDeLaCalle(undefined, lugares), [])
})

test('ubicacionInicial: el tramo guardado manda; después altura; después entre calles (OT viejas); si no, toda la calle', () => {
  const tramo = cortar(buenosAires, 150, 300)
  assert.equal(ubicacionInicial({ tramo, calleEntre1: 'Catamarca', calleEntre2: 'Jujuy' }).modoUbicacion, MODOS_UBICACION.TRAMO)
  assert.equal(ubicacionInicial({ altura: '350' }).modoUbicacion, MODOS_UBICACION.ALTURA)
  assert.deepEqual(ubicacionInicial({ calleEntre1: 'Catamarca', calleEntre2: 'La Rioja' }),
    { tramo: null, calleEntre1: 'Catamarca', calleEntre2: 'La Rioja', altura: '', modoUbicacion: 'ENTRE_CALLES' })
  assert.equal(ubicacionInicial({}).modoUbicacion, MODOS_UBICACION.NINGUNA)
  assert.equal(ubicacionInicial(null).modoUbicacion, MODOS_UBICACION.NINGUNA)
})

test('callesOfrecidas: "Entre calles" ofrece solo las que cruzan (no Lejana ni la propia calle)', () => {
  assert.deepEqual(callesOfrecidas({ calle: buenosAires, cruces, modo: 'ENTRE_CALLES' }), ['Catamarca', 'La Rioja', 'Jujuy'])
  assert.deepEqual(callesOfrecidas({ calle: lejana, cruces: crucesDeLaCalle(lejana, lugares), modo: 'ENTRE_CALLES' }), [])
})

test('callesOfrecidas: con un tramo desde la mitad de la cuadra, solo las que lo limitan', () => {
  // desde la mitad entre Catamarca y La Rioja hasta la mitad entre La Rioja y Jujuy
  const tramo = cortar(buenosAires, 150, 250)
  assert.deepEqual(callesOfrecidas({ calle: buenosAires, cruces, modo: 'TRAMO', tramo }), ['Catamarca', 'La Rioja', 'Jujuy'])
  // de esquina a esquina: solo esas dos
  assert.deepEqual(callesOfrecidas({ calle: buenosAires, cruces, modo: 'TRAMO', tramo: cortar(buenosAires, 100, 200) }),
    ['Catamarca', 'La Rioja'])
})

test('callesOfrecidas suma las ya elegidas (OT viejas con calles que ya no cruzan)', () => {
  assert.deepEqual(callesOfrecidas({ calle: buenosAires, cruces, modo: 'ENTRE_CALLES', elegidas: ['Catamarca', 'Vieja', ''] }),
    ['Catamarca', 'La Rioja', 'Jujuy', 'Vieja'])
  assert.deepEqual(callesOfrecidas({ calle: buenosAires, cruces, modo: 'NINGUNA' }), [])
})

test('validarUbicacion: entre calles pide las dos, distintas; sin calles que crucen avisa', () => {
  const ofrecidas = ['Catamarca', 'La Rioja', 'Jujuy']
  assert.deepEqual(validarUbicacion(datos({ modoUbicacion: 'ENTRE_CALLES' }), ofrecidas),
    { calleEntre1: 'Elegí la primera calle.', calleEntre2: 'Elegí la segunda calle.' })
  assert.deepEqual(validarUbicacion(datos({ modoUbicacion: 'ENTRE_CALLES', calleEntre1: 'Jujuy', calleEntre2: 'Jujuy' }), ofrecidas),
    { calleEntre2: 'Elegí una calle distinta.' })
  assert.match(validarUbicacion(datos({ modoUbicacion: 'ENTRE_CALLES' }), []).modoUbicacion, /no cruza con ninguna calle/)
  assert.deepEqual(validarUbicacion(datos({ modoUbicacion: 'ALTURA', altura: '  ' }), []), { altura: 'Indicá la altura.' })
  assert.deepEqual(validarUbicacion(datos({}), []), {})
})

test('validarUbicacion: con el tramo marcado las calles son opcionales, pero van las dos o ninguna', () => {
  const tramo = cortar(buenosAires, 150, 250)
  assert.deepEqual(validarUbicacion(datos({ modoUbicacion: 'TRAMO', tramo }), []), {})
  assert.deepEqual(validarUbicacion(datos({ modoUbicacion: 'TRAMO', tramo, calleEntre1: 'Catamarca' }), []),
    { calleEntre2: 'Elegí la segunda calle (o dejá las dos vacías).' })
  assert.ok(validarUbicacion(datos({ modoUbicacion: 'TRAMO' }), []).modoUbicacion)
})

test('pedidoDeUbicacion: el tramo marcado viaja tal cual con sus calles', () => {
  const tramo = cortar(buenosAires, 150, 250)
  assert.deepEqual(pedidoDeUbicacion({ calle: buenosAires, cruces, datos: datos({ modoUbicacion: 'TRAMO', tramo, calleEntre1: 'Catamarca', calleEntre2: 'Jujuy' }) }),
    { calleEntre1: 'Catamarca', calleEntre2: 'Jujuy', altura: null, tramo })
  assert.deepEqual(pedidoDeUbicacion({ calle: buenosAires, cruces, datos: datos({ modoUbicacion: 'TRAMO', tramo, calleEntre1: 'Catamarca' }) }),
    { calleEntre1: null, calleEntre2: null, altura: null, tramo })
})

test('pedidoDeUbicacion: elegir dos calles a mano arma el tramo de esquina a esquina', () => {
  const pedido = pedidoDeUbicacion({ calle: buenosAires, cruces, datos: datos({ modoUbicacion: 'ENTRE_CALLES', calleEntre1: 'Jujuy', calleEntre2: 'Catamarca' }) })
  assert.equal(pedido.calleEntre1, 'Jujuy')
  const { desde, hasta } = distanciasDelTramo(buenosAires, pedido.tramo)
  cerca(desde, 100)
  cerca(hasta, 300)
  // calles que no se cruzan (OT vieja): se guardan los nombres, sin tramo
  assert.equal(pedidoDeUbicacion({ calle: buenosAires, cruces, datos: datos({ modoUbicacion: 'ENTRE_CALLES', calleEntre1: 'Vieja', calleEntre2: 'Jujuy' }) }).tramo, null)
})

test('pedidoDeUbicacion: toda la calle, por altura y lugares que no son calles mandan tramo null (así el PUT lo borra)', () => {
  const tramo = cortar(buenosAires, 150, 250)
  const vacio = { calleEntre1: null, calleEntre2: null, altura: null, tramo: null }
  assert.deepEqual(pedidoDeUbicacion({ calle: buenosAires, cruces, datos: datos({ tramo, calleEntre1: 'Catamarca', calleEntre2: 'Jujuy' }) }), vacio)
  assert.deepEqual(pedidoDeUbicacion({ calle: buenosAires, cruces, datos: datos({ modoUbicacion: 'ALTURA', altura: ' 350 ', tramo }) }), { ...vacio, altura: '350' })
  assert.deepEqual(pedidoDeUbicacion({ calle: plaza, cruces: [], datos: datos({ modoUbicacion: 'TRAMO', tramo }) }), vacio)
})
