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

test('nueva y vieja cambian solo la lámpara (clase extra); "Sin marcar" o nada queda como siempre', () => {
  assert.match(htmlPoste('funciona', 'nueva'), /class="poste poste-funciona poste-nueva"/)
  assert.match(htmlPoste('apagada', 'vieja'), /class="poste poste-apagada poste-vieja"/)
  assert.match(htmlPoste('apagada', 'vieja'), /poste-insignia-apagada/) // la insignia del estado sigue
  assert.equal(htmlPoste('funciona', 'sinMarcar'), htmlPoste('funciona'))
  assert.equal(htmlPoste('funciona', null), htmlPoste('funciona'))
  assert.equal(htmlPoste('funciona', '"><script>'), htmlPoste('funciona')) // nunca se mete texto ajeno
})
