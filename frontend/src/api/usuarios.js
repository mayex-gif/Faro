// Funciones para hablar con el backend de Usuarios (ABM del personal).
// Solo las pueden usar el encargado del corralón y la mesa de entradas: con otro rol el backend responde 403.
// La clave nunca vuelve del backend: los usuarios llegan como { id, nombre, apellido, email, rol, cuadrillaId, activo }.
// Detalle de las reglas en LOGIN_Y_ACCESOS_BACKEND.md ("Gestión de usuarios").
import { pedir } from './cliente.js'

// GET: todo el personal (activos y dados de baja), ordenado por apellido.
export function listarUsuarios() {
  return pedir('/usuarios')
}

// POST: alta con clave inicial. Responde el usuario creado (201).
// 409 si el email ya existe o si es capataz sin cuadrilla; 404 si la cuadrilla no existe; 400 si faltan datos.
export function crearUsuario(datos) {
  return pedir('/usuarios', { method: 'POST', body: JSON.stringify(datos) })
}

// PUT: cambia nombre, apellido, email, rol y cuadrilla (la clave no). Responde el usuario actualizado.
// 409 si el email es de otra persona o si se le saca el rol al último encargado activo.
export function modificarUsuario(id, datos) {
  return pedir(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(datos) })
}

// PATCH: activo = false da de baja (no puede entrar más, ni con la sesión abierta); true reactiva.
// 409 si es uno mismo o el último encargado activo.
export function cambiarActivo(id, activo) {
  return pedir(`/usuarios/${id}/activo`, { method: 'PATCH', body: JSON.stringify({ activo }) })
}

// PATCH: restablece la clave (mínimo 8 caracteres). Responde 204: no devuelve nada.
export function restablecerClave(id, clave) {
  return pedir(`/usuarios/${id}/clave`, { method: 'PATCH', body: JSON.stringify({ clave }) })
}
