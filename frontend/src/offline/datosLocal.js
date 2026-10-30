import { tareasDeCuadrilla } from '../utils/tareas.js'

export function esCapatazConCuadrilla(usuario) {
  return usuario?.activo === true && usuario.rol === 'CAPATAZ_CUADRILLA' && usuario.id != null && usuario.cuadrillaId != null
}

// Versión 2 (26/10/2026): también guarda los estados y sus caminos, para poder iniciar y finalizar sin señal.
// Una copia de la versión 1 no se usa: se pide volver a guardarla con conexión.
export const VERSION_COPIA = 2

// Una sola copia, del capataz actual. No se guarda el listado completo del municipio.
export function crearCopia(usuario, cuadrilla, ordenes, estados, fecha = new Date()) {
  if (!esCapatazConCuadrilla(usuario) || String(cuadrilla?.id) !== String(usuario.cuadrillaId)) {
    throw new Error('La cuadrilla no corresponde a tu cuenta.')
  }
  return {
    id: 'actual', version: VERSION_COPIA, usuarioId: usuario.id, cuadrillaId: usuario.cuadrillaId,
    cuadrillaNombre: cuadrilla.nombre, fechaGuardado: fecha.toISOString(),
    ordenes: tareasDeCuadrilla(ordenes, estados, cuadrilla.id).map((orden) => ({
      id: orden.id, descripcion: orden.descripcion, lugarId: orden.lugarId, lugarNombre: orden.lugarNombre,
      prioridad: orden.prioridad, tipo: orden.tipo, estadoId: orden.estadoId,
      estadoNombre: orden.estadoNombre, estadoColor: orden.estadoColor, cuadrillaId: orden.cuadrillaId,
    })),
    // Los estados y a cuáles se puede pasar desde cada uno (de ahí salen los botones Iniciar / Finalizar)
    estados: estados.map((estado) => ({
      id: estado.id, nombre: estado.nombre, color: estado.color, inicial: Boolean(estado.inicial),
      cierre: Boolean(estado.cierre), siguientes: [...(estado.siguientes ?? [])],
    })),
  }
}

export function copiaDelUsuario(copia, usuario) {
  return esCapatazConCuadrilla(usuario) && copia?.id === 'actual'
    && copia.version === VERSION_COPIA
    && Array.isArray(copia.estados)
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

// Cuando el servidor responde un cambio hecho desde la copia, la copia se pone al día:
// - llegó bien → la OT queda en el estado que confirmó el servidor;
// - conflicto → la OT queda en el estado en que está de verdad (o sale de la copia si ya no es de la cuadrilla o no existe).
// resultado = { respuesta } (la OT que devolvió el servidor) o { conflicto } (ver datosCola.conflictoDesdeError).
export function actualizarCopia(copia, operacion, { respuesta, conflicto } = {}) {
  if (!copia || operacion?.tipo !== 'CAMBIO_ESTADO') return copia
  const ordenes = copia.ordenes.flatMap((orden) => {
    if (orden.id !== operacion.ordenId) return [orden]
    if (respuesta) {
      return [{ ...orden, estadoId: respuesta.estadoId, estadoNombre: respuesta.estadoNombre, estadoColor: respuesta.estadoColor }]
    }
    if (['OTRA_CUADRILLA', 'ORDEN_NO_EXISTE'].includes(conflicto?.motivo)) return []
    if (conflicto?.estadoActualId != null) {
      const estado = copia.estados.find((opcion) => opcion.id === conflicto.estadoActualId)
      return [{ ...orden, estadoId: conflicto.estadoActualId, estadoNombre: conflicto.estadoActual ?? estado?.nombre,
        estadoColor: estado?.color ?? orden.estadoColor }]
    }
    return [orden]
  })
  return { ...copia, ordenes }
}
