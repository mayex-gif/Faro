const ENCARGADO = 'ENCARGADO_CORRALON'
const MESA = 'MESA_ENTRADAS'
const CAPATAZ = 'CAPATAZ_CUADRILLA'

export const NOMBRES_ROL = {
  [ENCARGADO]: 'Encargado del corralón',
  [MESA]: 'Mesa de entradas',
  [CAPATAZ]: 'Capataz de cuadrilla',
}

const VISTAS_POR_ROL = {
  [ENCARGADO]: ['mapa', 'ordenes', 'asignacion', 'infraestructura', 'ficha', 'tareas'],
  [MESA]: ['mapa', 'ordenes', 'ficha'],
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
// de un lugar que todavía no está cargado). El capataz no. Ojo: hoy solo lo controla la pantalla;
// el backend todavía no valida roles (tarjeta "Agregar las validaciones por roles en el backend").
export function puedeAgregarLugar(usuario) {
  return tieneRol(usuario, ENCARGADO, MESA)
}
