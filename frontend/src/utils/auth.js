// Roles y reglas de sesión de FARO. Datos y funciones puras (se prueban con "npm test").
// La persistencia (localStorage) y el estado de React viven en context/AuthContext.jsx.

export const ROLES = {
  ENCARGADO_CORRALON: 'ENCARGADO_CORRALON',
  CAPATAZ_CUADRILLA: 'CAPATAZ_CUADRILLA',
  MESA_ENTRADAS: 'MESA_ENTRADAS',
}

// Nombre para mostrar en pantalla (barra de usuario, mensajes). No es el valor que manda el backend.
export const NOMBRE_ROL = {
  [ROLES.ENCARGADO_CORRALON]: 'Encargado del corralón',
  [ROLES.CAPATAZ_CUADRILLA]: 'Capataz de cuadrilla',
  [ROLES.MESA_ENTRADAS]: 'Mesa de entradas',
}

export function nombreRol(rol) {
  return NOMBRE_ROL[rol] ?? rol
}

// Hay sesión iniciada si hay token y datos de usuario (los dos se guardan y se borran juntos).
export function estaAutenticado(token, usuario) {
  return Boolean(token && usuario)
}

// ¿El usuario logueado tiene alguno de los roles indicados?
// Sin usuario (todavía no cargó o no hay sesión), nunca cumple ningún rol.
export function tieneRol(usuario, ...rolesPermitidos) {
  if (!usuario) return false
  return rolesPermitidos.includes(usuario.rol)
}
