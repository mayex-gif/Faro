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

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)
  // Nunca se almacenan respuestas de la API, escrituras, credenciales ni mapas de terceros.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  let ruta = url.pathname
  if (request.mode === 'navigate') {
    if (!['/', '/index.html', '/sin-conexion.html'].includes(ruta)) return
    ruta = ruta === '/sin-conexion.html' ? ruta : '/index.html'
  }
  if (!ARCHIVOS_FARO.includes(ruta)) return
  evento.respondWith(caches.open(CACHE_FARO).then(async (cache) => {
    const guardado = await cache.match(ruta)
    return guardado || fetch(request)
  }))
})
