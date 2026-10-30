const ENCARGADO = 'ENCARGADO_CORRALON'
const MESA = 'MESA_ENTRADAS'
const CAPATAZ = 'CAPATAZ_CUADRILLA'

export const NOMBRES_ROL = {
  [ENCARGADO]: 'Encargado del corralón',
  [MESA]: 'Mesa de entradas',
  [CAPATAZ]: 'Capataz de cuadrilla',
}

const VISTAS_POR_ROL = {
  [ENCARGADO]: ['mapa', 'ordenes', 'asignacion', 'infraestructura', 'ficha', 'tareas', 'usuarios'],
  [MESA]: ['mapa', 'ordenes', 'ficha', 'usuarios'],
  [CAPATAZ]: ['tareas', 'mapa', 'ficha'],
}

export function tieneRol(usuario, ...roles) {
  return usuario?.activo === true && roles.includes(usuario.rol)
}

export function rolConocido(rol) {
  return Object.hasOwn(VISTAS_POR_ROL, rol)
}

export function puedeVer(usuario, clave) {
  return usuario?.activo === true && rolConocido(usuario.rol) && VISTAS_POR_ROL[usuario.rol].includes(clave)
}

export function inicioDe(usuario) {
  return tieneRol(usuario, CAPATAZ) ? 'tareas' : 'mapa'
}

export function puedeCrearOrden(usuario) {
  return tieneRol(usuario, ENCARGADO, MESA)
}

export function puedeAsignar(usuario) {
  return tieneRol(usuario, ENCARGADO)
}

// Agregar un lugar tocando el mapa: el encargado y mesa de entradas (por ejemplo, al recibir un reclamo
// de un lugar que todavía no está cargado). El capataz no. El backend valida lo mismo: si otro rol lo intenta,
// responde 403 (ver "Permisos por rol" en LOGIN_Y_ACCESOS_BACKEND.md).
export function puedeAgregarLugar(usuario) {
  return tieneRol(usuario, ENCARGADO, MESA)
}

// Gestionar usuarios (altas, bajas, cambios de rol y restablecer claves): el encargado y mesa de entradas,
// con los mismos permisos (decisión del equipo, 25/10/2026). El backend valida lo mismo (403 para el capataz).
export function puedeGestionarUsuarios(usuario) {
  return tieneRol(usuario, ENCARGADO, MESA)
}
