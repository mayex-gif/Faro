/* global CACHE_FARO, ARCHIVOS_FARO */
// El build agrega el nombre de versión y las rutas exactas de sus archivos estáticos.
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_FARO).then((cache) => cache.addAll(ARCHIVOS_FARO)))
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.keys().then((nombres) => Promise.all(
    nombres.filter((nombre) => nombre.startsWith('faro-app-') && nombre !== CACHE_FARO)
      .map((nombre) => caches.delete(nombre)),
  )).then(() => self.clients.claim()))
})

// La persona tocó "Actualizar" en el cartel de versión nueva: esta versión (que estaba esperando) pasa a mandar.
// Nunca se hace sola: así no se recarga la pantalla en medio de un trabajo.
self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'ACTUALIZAR') self.skipWaiting()
})

// Las páginas (index.html, sin-conexion.html) se piden PRIMERO a la red: así, al abrir FARO después de un deploy,
// se ve la versión nueva. Si no hay señal (o tarda más de 4 segundos), se usa la guardada.
const ESPERA_RED = 4000

function desdeLaRed(request) {
  return new Promise((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new Error('La red tardó demasiado')), ESPERA_RED)
    fetch(request).then((respuesta) => {
      clearTimeout(reloj)
      if (respuesta.ok) resolver(respuesta)
      else rechazar(new Error(`Error ${respuesta.status}`))
    }, (error) => {
      clearTimeout(reloj)
      rechazar(error)
    })
  })
}

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)
  // Nunca se almacenan respuestas de la API, escrituras, credenciales ni mapas de terceros.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  let ruta = url.pathname
  if (request.mode === 'navigate') {
    if (!['/', '/index.html', '/sin-conexion.html'].includes(ruta)) return
    ruta = ruta === '/sin-conexion.html' ? ruta : '/index.html'
    evento.respondWith(desdeLaRed(request).catch(() => caches.match(ruta)))
    return
  }
  // Los archivos del build (JS, CSS, imágenes) tienen el contenido en el nombre: primero los guardados.
  // Se buscan en TODAS las versiones guardadas: una página nueva puede pedir archivos de la versión que espera.
  if (!ARCHIVOS_FARO.includes(ruta) && !ruta.startsWith('/assets/')) return
  evento.respondWith(caches.match(ruta).then((guardado) => guardado || fetch(request)))
})
