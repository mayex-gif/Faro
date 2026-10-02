// Cliente común para hablar con el backend.
// Si el backend responde con error, lee su respuesta ({ estado, mensaje, errores })
// para que la pantalla pueda mostrarle al usuario el motivo real.

export const API_BASE = 'http://localhost:8080/api'

// Error con más información que un Error común: el código HTTP y los errores por campo
export class ErrorApi extends Error {
  constructor(estado, mensaje, errores = {}) {
    super(mensaje)
    this.estado = estado   // ej: 400, 404, 409
    this.errores = errores // ej: { descripcion: "La descripción es obligatoria" }
  }
}

// Hace el pedido, revisa si salió bien y devuelve los datos
export async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  })

  if (!respuesta.ok) {
    let cuerpo = null
    try {
      cuerpo = await respuesta.json()
    } catch {
      // la respuesta de error no traía JSON: usamos un mensaje genérico
    }
    throw new ErrorApi(respuesta.status, cuerpo?.mensaje ?? `Error ${respuesta.status}`, cuerpo?.errores ?? {})
  }

  // 204 = "sin contenido" (por ejemplo, al borrar): no hay datos para leer
  if (respuesta.status === 204) return null
  return respuesta.json()
}