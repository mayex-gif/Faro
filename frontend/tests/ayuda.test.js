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
