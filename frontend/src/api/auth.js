import { pedir } from './cliente.js'

export function iniciarSesion(email, password) {
  return pedir('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    autenticacion: false,
  })
}

export function obtenerPerfil() {
  return pedir('/auth/perfil')
}
