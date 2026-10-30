// Cliente común para hablar con el backend.
// Si el backend responde con error, lee su respuesta ({ estado, mensaje, errores })
// para que la pantalla pueda mostrarle al usuario el motivo real.

// Dirección base de la API:
// - En la compu y en Docker no se define nada: queda '/api' y el proxy de Vite lo reenvía al backend.
// - En la nube (Render) se compila con la variable VITE_API_URL,
//   ej.: VITE_API_URL=https://faro-backend-6cq7.onrender.com/api
// Vite reemplaza VITE_API_URL al compilar (si se cambia, hay que volver a compilar).
// El "?." es porque fuera de Vite (por ejemplo, en los tests con node) import.meta.env no existe.
// Si la dirección termina con "/", se la sacamos para no pedir "/api//cuadrillas".
import { leerToken, terminarSesion } from '../utils/sesion.js'

export const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '')

// Error con más información que un Error común: el código HTTP y los errores por campo
export class ErrorApi extends Error {
  constructor(estado, mensaje, errores = {}) {
    super(mensaje)
    this.estado = estado   // ej: 400, 404, 409
    this.errores = errores // ej: { descripcion: "La descripción es obligatoria" }
  }
}

// Hace el pedido, revisa si salió bien y devuelve los datos
export async function pedir(ruta, { autenticacion = true, headers = {}, ...opciones } = {}) {
  const token = autenticacion ? leerToken() : ''
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!respuesta.ok) {
    let cuerpo = null
    try {
      cuerpo = await respuesta.json()
    } catch {
      // la respuesta de error no traía JSON: usamos un mensaje genérico
    }
    if (respuesta.status === 401 && autenticacion) terminarSesion(token)
    throw new ErrorApi(respuesta.status, cuerpo?.mensaje ?? `Error ${respuesta.status}`, cuerpo?.errores ?? {})
  }

  // 204 = "sin contenido" (por ejemplo, al borrar): no hay datos para leer
  if (respuesta.status === 204) return null
  return respuesta.json()
}
