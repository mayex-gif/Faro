// El servidor de desarrollo conserva la recarga de Vite; la copia de la aplicación se prueba con el build.
export function registrarAplicacion() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.warn('No se pudo preparar FARO para abrir sin conexión.', error)
  })
}
