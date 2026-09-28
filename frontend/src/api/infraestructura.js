// Funciones para hablar con el backend de Puntos de Infraestructura.
// Todas usan rutas /api/..., que Vite reenvía al backend (ver vite.config.js).

const URL_BASE = '/api/infraestructura'

// Función común: hace el pedido, revisa si salió bien y devuelve los datos
async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  })
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} al llamar a ${url}`)
  }
  // Borrar devuelve 204 ("sin contenido"): no hay datos para leer
  if (respuesta.status === 204) return null
  return respuesta.json()
}

// GET: traer todos los puntos
export function listarPuntos() {
  return pedir(URL_BASE)
}

// POST: crear un punto nuevo
export function crearPunto(punto) {
  return pedir(URL_BASE, { method: 'POST', body: JSON.stringify(punto) })
}

// PUT: modificar un punto existente
export function actualizarPunto(id, punto) {
  return pedir(`${URL_BASE}/${id}`, { method: 'PUT', body: JSON.stringify(punto) })
}

// DELETE: borrar un punto
export function eliminarPunto(id) {
  return pedir(`${URL_BASE}/${id}`, { method: 'DELETE' })
}