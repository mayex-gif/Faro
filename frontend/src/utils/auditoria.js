// Lógica de la pantalla "Auditoría" (sin React), para poder probarla con "npm test".
// La trazabilidad la guarda sola el backend ante cualquier alta, modificación o baja de un registro clave
// (ver AuditoriaController.java): acá solo se arman los filtros y se da formato a lo que devuelve.

export const ACCIONES = [
  { valor: 'CREACION', etiqueta: 'Creación' },
  { valor: 'MODIFICACION', etiqueta: 'Modificación' },
  { valor: 'ELIMINACION', etiqueta: 'Eliminación' },
]

// Nombres de entidad que guarda el backend en "tipoRegistro" (el nombre simple de la clase Java),
// con un texto más claro para mostrarlo. Es una sugerencia (datalist): el campo sigue siendo de texto libre,
// porque el backend no informa esta lista y no queremos que quede desactualizada si se agrega una entidad.
export const TIPOS_REGISTRO_CONOCIDOS = [
  { valor: 'OrdenTrabajo', etiqueta: 'Orden de trabajo' },
  { valor: 'PuntoInfraestructura', etiqueta: 'Punto de infraestructura' },
  { valor: 'Usuario', etiqueta: 'Usuario' },
  { valor: 'Cuadrilla', etiqueta: 'Cuadrilla' },
  { valor: 'EstadoOrden', etiqueta: 'Estado de orden' },
  { valor: 'TransicionEstado', etiqueta: 'Transición de estado' },
  { valor: 'ReglaMantenimiento', etiqueta: 'Regla de mantenimiento' },
]

export const FILTROS_VACIOS = { accion: '', tipoRegistro: '', registroId: '', actor: '', desde: '', hasta: '' }

export const TAMANIO_PAGINA = 20

// Busca el texto para mostrar de un valor. Ej: etiqueta(ACCIONES, 'CREACION') → 'Creación'
export function etiqueta(lista, valor) {
  return lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
}

// "2026-10-01T18:50:05" → "1/10/26, 18:50"
export function formatearFecha(fechaIso) {
  if (!fechaIso) return '—'
  return new Date(fechaIso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

// Convierte los filtros del formulario (fechas "yyyy-mm-dd" de un <input type="date">) en lo que pide
// AuditoriaController: "desde" arranca el día a las 00:00:00 y "hasta" lo cierra a las 23:59:59,
// así el rango incluye los dos días completos, igual que el filtro de fechas de Órdenes de trabajo.
export function parametrosDesde(filtros) {
  const limpios = {}
  if (filtros.accion) limpios.accion = filtros.accion
  if (filtros.tipoRegistro?.trim()) limpios.tipoRegistro = filtros.tipoRegistro.trim()
  if (filtros.registroId?.trim()) limpios.registroId = filtros.registroId.trim()
  if (filtros.actor?.trim()) limpios.actor = filtros.actor.trim()
  if (filtros.desde) limpios.desde = `${filtros.desde}T00:00:00`
  if (filtros.hasta) limpios.hasta = `${filtros.hasta}T23:59:59`
  return limpios
}

// Un rango invertido (desde posterior a hasta) no tiene sentido: se avisa antes de mandar el pedido.
export function rangoValido(filtros) {
  if (!filtros.desde || !filtros.hasta) return true
  return filtros.desde <= filtros.hasta
}

// Compara los valores anteriores y nuevos de un registro y arma una lista de campos para mostrar.
// - En una CREACIÓN no hay "anteriores": todos los campos se muestran como nuevos.
// - En una ELIMINACIÓN no hay "nuevos": todos los campos se muestran como los últimos que tenía.
// - En una MODIFICACIÓN se marca "cambio: true" en los campos que efectivamente cambiaron,
//   así la pantalla puede resaltarlos en vez de mostrar una lista plana de 15 campos iguales.
export function diferenciasCampos(valoresAnteriores, valoresNuevos) {
  const anteriores = valoresAnteriores ?? {}
  const nuevos = valoresNuevos ?? {}
  const campos = [...new Set([...Object.keys(anteriores), ...Object.keys(nuevos)])].sort((a, b) => a.localeCompare(b, 'es'))
  return campos.map((campo) => {
    const antes = anteriores[campo]
    const despues = nuevos[campo]
    return { campo, antes, despues, cambio: Object.hasOwn(anteriores, campo) && Object.hasOwn(nuevos, campo) && !sonIguales(antes, despues) }
  })
}

// Un valor de "antes"/"después" puede ser texto, número, booleano, null o (si el campo es una relación) un objeto.
export function formatearValorCampo(valor) {
  if (valor === null || valor === undefined) return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

function sonIguales(a, b) {
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return a === b
}
