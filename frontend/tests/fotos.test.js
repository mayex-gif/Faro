import test from 'node:test'
import assert from 'node:assert/strict'
import { CALIDAD_JPEG, LADO_MAXIMO, achicarFoto, medidasAchicadas, pareceImagen } from '../src/utils/fotos.js'

test('medidasAchicadas deja el lado mayor en 1600 px sin deformar la foto', () => {
  assert.deepEqual(medidasAchicadas(4000, 3000), { ancho: 1600, alto: 1200 })
  assert.deepEqual(medidasAchicadas(3024, 4032), { ancho: 1200, alto: 1600 }) // celular parado
  assert.deepEqual(medidasAchicadas(1600, 900), { ancho: 1600, alto: 900 })
  assert.deepEqual(medidasAchicadas(800, 600), { ancho: 800, alto: 600 }) // chica: no se agranda
  assert.deepEqual(medidasAchicadas(1000, 333, 500), { ancho: 500, alto: 167 })
})

test('pareceImagen mira el tipo que informa el celular', () => {
  assert.equal(pareceImagen({ type: 'image/jpeg' }), true)
  assert.equal(pareceImagen({ type: 'image/heic' }), true)
  assert.equal(pareceImagen({ type: 'application/pdf' }), false)
  assert.equal(pareceImagen({}), false)
  assert.equal(pareceImagen(null), false)
})

// Herramientas falsas de dibujo: anotan qué se hizo (node no tiene canvas)
function herramientasFalsas({ ancho = 4000, alto = 3000, falla = false, conConvertToBlob = true } = {}) {
  const anotado = { dibujos: [], lienzo: null, cerrada: false, formato: null }
  const imagen = { width: ancho, height: alto, close: () => { anotado.cerrada = true } }
  const pincel = {
    fillRect: (...args) => anotado.dibujos.push(['fondo', ...args]),
    drawImage: (img, ...args) => anotado.dibujos.push(['foto', img === imagen, ...args]),
  }
  const herramientas = {
    abrirImagen: async () => {
      if (falla) throw new Error('formato desconocido')
      return imagen
    },
    crearLienzo: (w, h) => {
      anotado.lienzo = { w, h }
      const lienzo = { getContext: () => pincel }
      if (conConvertToBlob) {
        lienzo.convertToBlob = async (opciones) => {
          anotado.formato = opciones
          return new Blob(['jpeg'], { type: 'image/jpeg' })
        }
      } else {
        lienzo.toBlob = (alTerminar, tipo, calidad) => {
          anotado.formato = { type: tipo, quality: calidad }
          alTerminar(new Blob(['jpeg'], { type: 'image/jpeg' }))
        }
      }
      return lienzo
    },
  }
  return { herramientas, anotado }
}

test('achicarFoto dibuja la foto en un lienzo de 1600 px y la devuelve en JPEG', async () => {
  const { herramientas, anotado } = herramientasFalsas()

  const blob = await achicarFoto({ type: 'image/jpeg' }, { herramientas })

  assert.equal(blob.type, 'image/jpeg')
  assert.deepEqual(anotado.lienzo, { w: 1600, h: 1200 })
  assert.deepEqual(anotado.dibujos, [['fondo', 0, 0, 1600, 1200], ['foto', true, 0, 0, 1600, 1200]])
  assert.deepEqual(anotado.formato, { type: 'image/jpeg', quality: CALIDAD_JPEG })
  assert.equal(anotado.cerrada, true) // libera la memoria de la foto grande
  assert.equal(LADO_MAXIMO, 1600)
})

test('achicarFoto funciona también con un <canvas> común (sin convertToBlob)', async () => {
  const { herramientas, anotado } = herramientasFalsas({ ancho: 800, alto: 600, conConvertToBlob: false })

  const blob = await achicarFoto({ type: 'image/png' }, { herramientas, calidad: 0.7 })

  assert.equal(blob.type, 'image/jpeg')
  assert.deepEqual(anotado.lienzo, { w: 800, h: 600 })
  assert.deepEqual(anotado.formato, { type: 'image/jpeg', quality: 0.7 })
})

test('achicarFoto avisa si no es una foto o si el navegador no la puede abrir', async () => {
  const { herramientas } = herramientasFalsas({ falla: true })

  await assert.rejects(achicarFoto({ type: 'application/pdf' }, { herramientas }), /no es una foto/)
  await assert.rejects(achicarFoto({ type: 'image/heic' }, { herramientas }), /No se pudo abrir esa foto/)
})

test('achicarFoto avisa si el lienzo no logra armar el JPEG', async () => {
  const { herramientas } = herramientasFalsas({ conConvertToBlob: false })
  const crear = herramientas.crearLienzo
  herramientas.crearLienzo = (w, h) => {
    const lienzo = crear(w, h)
    lienzo.toBlob = (alTerminar) => alTerminar(null)
    return lienzo
  }

  await assert.rejects(achicarFoto({ type: 'image/jpeg' }, { herramientas }), /sin blob/)
})
