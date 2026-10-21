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
export const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '')

// Error con más información que un Error común: el código HTTP y los errores por campo
export class ErrorApi extends Error {
  constructor(estado, mensaje, errores = {}) {
    super(mensaje)
    this.estado = estado   // ej: 400, 404, 409
    this.errores = errores // ej: { descripcion: "La descripción es obligatoria" }
  }
}

// Token de la sesión activa, en memoria (no se lee de localStorage en cada pedido).
// AuthContext lo sincroniza con localStorage al arrancar la app, al iniciar sesión y al cerrarla.
// Mantenerlo acá, y no acceder a localStorage directamente, hace que este archivo se pueda
// probar con "npm test" sin un navegador real.
let token = null

export function establecerToken(nuevoToken) {
  token = nuevoToken
}

// A qué avisar cuando el backend dice que la sesión ya no vale (401 con un token enviado).
// AuthContext se suscribe acá para cerrar la sesión y mandar al login, sin que este archivo
// dependa del contexto de React.
let alVencerSesion = null

export function alRecibirSesionVencida(funcion) {
  alVencerSesion = funcion
}

// Hace el pedido, revisa si salió bien y devuelve los datos
export async function pedir(ruta, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...opciones.headers }
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`

  const respuesta = await fetch(`${API_BASE}${ruta}`, { ...opciones, headers })

  // Un 401 sin token enviado es, por ejemplo, un login con contraseña incorrecta: no es una sesión
  // que venció, así que no dispara el logout global (eso lo maneja la propia pantalla de login).
  if (respuesta.status === 401 && token) alVencerSesion?.()

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