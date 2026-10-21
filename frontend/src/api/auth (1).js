// Llamadas a /api/auth/* (LOGIN_Y_ACCESOS_BACKEND.md).
import { pedir } from './cliente'

export function iniciarSesion(email, password) {
  return pedir('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// Datos de la cuenta autenticada que hace el pedido (usa el token ya guardado, vía cliente.js).
export function obtenerPerfil() {
  return pedir('/auth/perfil')
}

// Valida un token puntual, pasado a mano (por ejemplo, al revisar la sesión guardada al arrancar
// la app, antes de confirmar que ese token siga siendo el de la sesión activa).
export function validarToken(token) {
  return pedir('/auth/validar', { headers: { Authorization: `Bearer ${token}` } })
}
