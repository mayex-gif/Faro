import { tareasDeCuadrilla } from '../utils/tareas.js'

export function esCapatazConCuadrilla(usuario) {
  return usuario?.activo === true && usuario.rol === 'CAPATAZ_CUADRILLA' && usuario.id != null && usuario.cuadrillaId != null
}

// Una sola copia, del capataz actual. No se guarda el listado completo del municipio.
export function crearCopia(usuario, cuadrilla, ordenes, estados, fecha = new Date()) {
  if (!esCapatazConCuadrilla(usuario) || String(cuadrilla?.id) !== String(usuario.cuadrillaId)) {
    throw new Error('La cuadrilla no corresponde a tu cuenta.')
  }
  return {
    id: 'actual', version: 1, usuarioId: usuario.id, cuadrillaId: usuario.cuadrillaId,
    cuadrillaNombre: cuadrilla.nombre, fechaGuardado: fecha.toISOString(),
    ordenes: tareasDeCuadrilla(ordenes, estados, cuadrilla.id).map((orden) => ({
      id: orden.id, descripcion: orden.descripcion, lugarId: orden.lugarId, lugarNombre: orden.lugarNombre,
      prioridad: orden.prioridad, tipo: orden.tipo, estadoId: orden.estadoId,
      estadoNombre: orden.estadoNombre, estadoColor: orden.estadoColor, cuadrillaId: orden.cuadrillaId,
    })),
  }
}

export function copiaDelUsuario(copia, usuario) {
  return esCapatazConCuadrilla(usuario) && copia?.id === 'actual'
    && copia.version === 1
    && String(copia.usuarioId) === String(usuario.id)
    && String(copia.cuadrillaId) === String(usuario.cuadrillaId)
    && Array.isArray(copia.ordenes)
    && copia.ordenes.every((orden) => orden && orden.id != null && typeof orden.descripcion === 'string'
      && ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].includes(orden.prioridad)
      && String(orden.cuadrillaId) === String(usuario.cuadrillaId))
    && Number.isFinite(Date.parse(copia.fechaGuardado))
}

export function fechaDeCopia(fecha) {
  return new Date(fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}
