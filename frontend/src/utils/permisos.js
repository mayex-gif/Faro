const ENCARGADO = 'ENCARGADO_CORRALON'
const MESA = 'MESA_ENTRADAS'
const CAPATAZ = 'CAPATAZ_CUADRILLA'

export const NOMBRES_ROL = {
  [ENCARGADO]: 'Encargado del corralón',
  [MESA]: 'Mesa de entradas',
  [CAPATAZ]: 'Capataz de cuadrilla',
}

const VISTAS_POR_ROL = {
  [ENCARGADO]: ['mapa', 'ordenes', 'asignacion', 'infraestructura', 'ficha', 'tareas', 'usuarios', 'mantenimiento', 'auditoria', 'reportes'],
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

// Cambiar el estado de una luminaria desde el mapa (Funciona / Apagada / Falta poner) es modificar el lugar:
// en el backend, PUT /api/infraestructura/{id} es solo del encargado. Los demás lo ven, pero no lo cambian.
export function puedeCambiarEstadoLuminaria(usuario) {
  return tieneRol(usuario, ENCARGADO)
}

// Gestionar usuarios (altas, bajas, cambios de rol y restablecer claves): el encargado y mesa de entradas,
// con los mismos permisos (decisión del equipo, 25/10/2026). El backend valida lo mismo (403 para el capataz).
export function puedeGestionarUsuarios(usuario) {
  return tieneRol(usuario, ENCARGADO, MESA)
}

// Mantenimiento periódico (Sprint 4, RF08): crear, editar, pausar/activar, borrar y forzar la generación de
// una regla. Solo el encargado del corralón (ver ReglaMantenimientoController.java, 403 para otros roles).
// Consultar las reglas y los desvíos no tiene esa restricción en el backend, pero la pantalla completa
// (acceso de menú) queda igual limitada al encargado: es una herramienta de planificación del corralón.
export function puedeGestionarMantenimiento(usuario) {
  return tieneRol(usuario, ENCARGADO)
}

// Auditoría (Sprint 4, RF10): consulta de trazabilidad de los registros clave del sistema.
// Solo el encargado del corralón (ver AuditoriaController.java, 403 para otros roles).
export function puedeVerAuditoria(usuario) {
  return tieneRol(usuario, ENCARGADO)
}

// Reportes e indicadores (Sprint 4, RF10): tablero de gestión y exportación CSV.
// Solo el encargado del corralón (ver ReporteController.java, 403 para otros roles).
export function puedeVerReportes(usuario) {
  return tieneRol(usuario, ENCARGADO)
}
