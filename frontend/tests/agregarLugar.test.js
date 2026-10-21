import test from 'node:test'
import assert from 'node:assert/strict'
import { puedeAgregarLugar } from '../src/utils/permisos.js'
import { CENTRO_PUEBLO, puntoEnLaZona, redondearCoordenada, ubicacionDelPunto } from '../src/utils/zona.js'

const usuario = (rol, activo = true) => ({ rol, activo })

test('el encargado y mesa de entradas pueden agregar lugares desde el mapa', () => {
  assert.equal(puedeAgregarLugar(usuario('ENCARGADO_CORRALON')), true)
  assert.equal(puedeAgregarLugar(usuario('MESA_ENTRADAS')), true)
})

test('el capataz, una cuenta inactiva o sin sesión no pueden', () => {
  assert.equal(puedeAgregarLugar(usuario('CAPATAZ_CUADRILLA')), false)
  assert.equal(puedeAgregarLugar(usuario('ENCARGADO_CORRALON', false)), false)
  assert.equal(puedeAgregarLugar(null), false)
})

test('un punto de la plaza está dentro del pueblo; uno en Córdoba capital, no', () => {
  assert.equal(puntoEnLaZona(CENTRO_PUEBLO.latitud, CENTRO_PUEBLO.longitud), true)
  assert.equal(puntoEnLaZona(-31.4201, -64.1888), false)
  assert.equal(puntoEnLaZona(NaN, -64.14), false)
})

test('las coordenadas se guardan con 6 decimales y en el orden de GeoJSON [longitud, latitud]', () => {
  assert.equal(redondearCoordenada(-31.133985112345), -31.133985)
  assert.deepEqual(ubicacionDelPunto({ latitud: -31.1339851, longitud: -64.1403792 }),
    { type: 'Point', coordinates: [-64.140379, -31.133985] })
})
