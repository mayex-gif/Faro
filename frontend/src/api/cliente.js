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

// Manda el pedido con el token de la sesión y, si el backend responde con error, lo convierte en ErrorApi.
async function enviarPedido(ruta, { autenticacion = true, headers = {}, ...opciones } = {}) {
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
  return respuesta
}

// Hace el pedido, revisa si salió bien y devuelve los datos
export async function pedir(ruta, opciones = {}) {
  const respuesta = await enviarPedido(ruta, opciones)
  // 204 = "sin contenido" (por ejemplo, al borrar): no hay datos para leer
  if (respuesta.status === 204) return null
  return respuesta.json()
}

// Nombre del archivo que propone el backend: Content-Disposition: attachment; filename="desvios-2026-11-06.csv"
export function nombreDeArchivo(contentDisposition, porDefecto) {
  const encontrado = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition ?? '')
  return encontrado ? decodeURIComponent(encontrado[1].trim()) : porDefecto
}

// Pide un archivo (por ejemplo, un CSV de Reportes) con la sesión iniciada y devuelve { contenido, nombre }.
// Un enlace común no sirve: no puede mandar el token en el encabezado Authorization.
export async function pedirArchivo(ruta, nombrePorDefecto) {
  const respuesta = await enviarPedido(ruta, { headers: { Accept: 'text/csv' } })
  return {
    contenido: await respuesta.blob(),
    nombre: nombreDeArchivo(respuesta.headers.get('Content-Disposition'), nombrePorDefecto),
  }
}
