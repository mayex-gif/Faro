import test from 'node:test'
import assert from 'node:assert/strict'
import { ANCLA_POSTE, TAMANO_POSTE, htmlPoste } from '../src/utils/poste.js'

test('el poste lleva la clase de su estado', () => {
  for (const estado of ['funciona', 'apagada', 'arreglo', 'falta']) {
    assert.match(htmlPoste(estado), new RegExp(`class="poste poste-${estado}"`))
  }
})

test('las apagadas llevan la insignia ✕ y las que están en arreglo la de la llave; las otras, ninguna', () => {
  assert.match(htmlPoste('apagada'), /poste-insignia-apagada/)
  assert.match(htmlPoste('arreglo'), /poste-insignia-arreglo/)
  assert.doesNotMatch(htmlPoste('funciona'), /poste-insignia/)
  assert.doesNotMatch(htmlPoste('falta'), /poste-insignia/)
})

test('un estado desconocido se dibuja como "funciona" (nunca se mete texto ajeno en el HTML)', () => {
  assert.equal(htmlPoste('<img src=x onerror=alert(1)>'), htmlPoste('funciona'))
  assert.equal(htmlPoste(undefined), htmlPoste('funciona'))
})

test('el dibujo usa los degradés de la página y el ancla cae dentro del dibujo', () => {
  assert.match(htmlPoste('funciona'), /url\(#faro-poste-metal\)/)
  assert.ok(ANCLA_POSTE[0] <= TAMANO_POSTE[0] && ANCLA_POSTE[1] <= TAMANO_POSTE[1])
})
