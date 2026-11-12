import test from 'node:test'
import assert from 'node:assert/strict'
import { AYUDA, ayudaPara } from '../src/utils/ayuda.js'
import { FUERA_DEL_MENU, MAS, SECCIONES } from '../src/utils/navegacion.js'

const pantallas = [...SECCIONES, ...MAS, ...FUERA_DEL_MENU].map((s) => s.clave)

test('todas las pantallas del menú y la de ingreso tienen ayuda', () => {
  for (const clave of [...pantallas, 'login']) {
    assert.ok(AYUDA[clave], `falta la ayuda de "${clave}"`)
    assert.ok(AYUDA[clave].titulo && AYUDA[clave].resumen, `la ayuda de "${clave}" necesita título y resumen`)
  }
})

test('una pantalla sin ayuda devuelve null', () => {
  assert.equal(ayudaPara('no-existe', 'ENCARGADO_CORRALON'), null)
})

test('cada rol ve solo lo que puede hacer', () => {
  const textos = (ayuda) => ayuda.secciones.flatMap((s) => s.items).join(' ')
  assert.match(textos(ayudaPara('mapa', 'ENCARGADO_CORRALON')), /Agregar lugar/)
  assert.match(textos(ayudaPara('mapa', 'MESA_ENTRADAS')), /Nueva OT acá/)
  assert.doesNotMatch(textos(ayudaPara('mapa', 'MESA_ENTRADAS')), /Asignar/)
  assert.doesNotMatch(textos(ayudaPara('mapa', 'CAPATAZ_CUADRILLA')), /Nueva OT acá|Agregar lugar/)
})

test('las secciones que quedan vacías para un rol no se muestran', () => {
  const titulos = (rol) => ayudaPara('ordenes', rol).secciones.map((s) => s.titulo)
  assert.ok(titulos('ENCARGADO_CORRALON').includes('Modificar una orden'))
  assert.ok(!titulos('MESA_ENTRADAS').includes('Modificar una orden'))
  assert.ok(!ayudaPara('tareas', 'ENCARGADO_CORRALON').secciones.some((s) => s.titulo === 'Sin señal'))
})

test('los items se devuelven como texto, listos para mostrar', () => {
  for (const clave of Object.keys(AYUDA)) {
    for (const seccion of ayudaPara(clave, 'ENCARGADO_CORRALON').secciones) {
      for (const item of seccion.items) assert.equal(typeof item, 'string')
    }
  }
})

test('la ayuda del mapa explica la pestaña Luminarias, y lo de luminarias a futuro solo le aparece al encargado', () => {
  const textos = (rol) => ayudaPara('mapa', rol).secciones.flatMap((s) => s.items).join(' ')
  assert.match(textos('CAPATAZ_CUADRILLA'), /¿Dónde falta luz\?/)
  assert.match(textos('ENCARGADO_CORRALON'), /Marcar como instalada/)
  assert.doesNotMatch(textos('MESA_ENTRADAS'), /Marcar como instalada/)
  assert.doesNotMatch(textos('CAPATAZ_CUADRILLA'), /Agregar luminaria/)
})

test('la ayuda explica cómo marcar un tramo de calle, y solo a quien puede crear OT', () => {
  const textos = (clave, rol) => ayudaPara(clave, rol).secciones.flatMap((s) => s.items).join(' ')
  assert.match(textos('mapa', 'MESA_ENTRADAS'), /¿Dónde es el trabajo\?/)
  assert.match(textos('mapa', 'ENCARGADO_CORRALON'), /se pega a ella/)
  assert.doesNotMatch(textos('mapa', 'CAPATAZ_CUADRILLA'), /Un tramo/)
  assert.match(textos('mapa', 'CAPATAZ_CUADRILLA'), /solo si tiene trabajos abiertos/)
  assert.match(textos('ordenes', 'MESA_ENTRADAS'), /solo aparecen las calles que la cruzan/)
})
