// Achica las fotos en el celular ANTES de mandarlas (tarjeta 16).
// Una foto de celular pesa 3–8 MB; achicada a 1600 px de lado mayor en JPEG queda en ~200–400 KB:
// sube rápido aunque haya poca señal y ocupa poco en el almacén (10 GB gratis).
// Además, al volver a dibujarla se pierden los datos ocultos de la foto (EXIF: el GPS de la casa, el modelo del celular...).

export const LADO_MAXIMO = 1600
export const CALIDAD_JPEG = 0.8

// Medidas nuevas, sin deformar la foto. Si ya es chica, no se agranda.
// Ej: 4000 x 3000 → 1600 x 1200; 900 x 1600 → igual; 1000 x 800 → igual.
export function medidasAchicadas(ancho, alto, maximo = LADO_MAXIMO) {
  const mayor = Math.max(ancho, alto)
  if (mayor <= maximo) return { ancho, alto }
  const escala = maximo / mayor
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}

// ¿Es algo que el celular dice que es una imagen? (la prueba de verdad la hace el backend con los primeros bytes)
export function pareceImagen(archivo) {
  return typeof archivo?.type === 'string' && archivo.type.startsWith('image/')
}

// Las herramientas del navegador para dibujar. Están aparte para poder reemplazarlas en los tests (node no las tiene).
const herramientasDelNavegador = {
  // "from-image": respeta si la foto se sacó con el celular girado
  abrirImagen: (archivo) => createImageBitmap(archivo, { imageOrientation: 'from-image' }),
  crearLienzo: (ancho, alto) => {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(ancho, alto)
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    return lienzo
  },
}

// Convierte el lienzo en un archivo JPEG (OffscreenCanvas y <canvas> lo hacen distinto)
function aJpeg(lienzo, calidad) {
  if (typeof lienzo.convertToBlob === 'function') return lienzo.convertToBlob({ type: 'image/jpeg', quality: calidad })
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('sin blob'))), 'image/jpeg', calidad)
  })
}

// Devuelve la foto achicada (un Blob JPEG). Si el navegador no la puede abrir (ej: un formato raro), avisa con un mensaje claro.
export async function achicarFoto(archivo, { maximo = LADO_MAXIMO, calidad = CALIDAD_JPEG, herramientas = herramientasDelNavegador } = {}) {
  if (!pareceImagen(archivo)) throw new Error('Ese archivo no es una foto')
  let imagen
  try {
    imagen = await herramientas.abrirImagen(archivo)
  } catch {
    throw new Error('No se pudo abrir esa foto. Probá con otra (JPG o PNG).')
  }
  try {
    const { ancho, alto } = medidasAchicadas(imagen.width, imagen.height, maximo)
    const lienzo = herramientas.crearLienzo(ancho, alto)
    const pincel = lienzo.getContext('2d')
    pincel.fillStyle = '#ffffff' // fondo blanco: un PNG con partes transparentes no queda negro en JPEG
    pincel.fillRect(0, 0, ancho, alto)
    pincel.drawImage(imagen, 0, 0, ancho, alto)
    return await aJpeg(lienzo, calidad)
  } finally {
    imagen.close?.() // libera la memoria de la imagen grande
  }
}
