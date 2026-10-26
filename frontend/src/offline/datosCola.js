// El "cuaderno" del celular: lo que se hizo sin señal y todavía no llegó al servidor.
// Cada renglón es una OPERACIÓN con su número de comanda (operacionId, un UUID):
// si el servidor la recibe dos veces, la aplica una sola (ver /api/sincronizacion en el backend).
// Funciones puras: no tocan IndexedDB ni la pantalla, así se prueban con "npm test".

export const CAMBIO_ESTADO = 'CAMBIO_ESTADO'
export const ALTA_ORDEN = 'ALTA_ORDEN'

// Cómo está un renglón del cuaderno
export const PENDIENTE = 'PENDIENTE' // todavía no llegó al servidor
export const CONFLICTO = 'CONFLICTO' // llegó, pero ya no valía (otra persona cambió la OT): decide la persona

// Qué hacer cuando el envío falla
export const REINTENTAR = 'REINTENTAR' // sin red o el servidor tuvo un problema: queda en el cuaderno
export const SESION = 'SESION'         // 401: la sesión venció o la cuenta se dio de baja; el cuaderno espera

const TIPOS = [CAMBIO_ESTADO, ALTA_ORDEN]
const ESTADOS = [PENDIENTE, CONFLICTO]

// Número de comanda. crypto.randomUUID solo existe en páginas seguras (https o localhost):
// si el celular entra por http (ej: la IP de la compu en la red de la casa), se arma con getRandomValues.
export function nuevoNumero(fuente = globalThis.crypto) {
  if (typeof fuente?.randomUUID === 'function') return fuente.randomUUID()
  const b = fuente.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40 // versión 4 (al azar)
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function base(usuario, tipo, ahora, numero) {
  return {
    operacionId: numero,
    tipo,
    usuarioId: usuario.id,
    usuarioNombre: `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim(), // para el aviso en el ingreso
    estado: PENDIENTE,
    creadaEn: ahora.toISOString(), // también es la hora real en que se hizo (hechoEn)
    intentos: 0,
    conflicto: null,
  }
}

// "Pasé la OT a otro estado". Guarda en qué estado la VIO (estadoAnteriorId): con eso el backend detecta conflictos.
export function crearCambioEstado(usuario, orden, estadoNuevo, { ahora = new Date(), numero = nuevoNumero() } = {}) {
  return {
    ...base(usuario, CAMBIO_ESTADO, ahora, numero),
    ordenId: orden.id,
    estadoId: estadoNuevo.id,
    estadoAnteriorId: orden.estadoId,
    // Para mostrarla en la pantalla mientras no se envía
    descripcion: orden.descripcion,
    lugarNombre: orden.lugarNombre,
    estadoNombre: estadoNuevo.nombre,
    estadoColor: estadoNuevo.color,
    estadoAnteriorNombre: orden.estadoNombre,
  }
}

// "Cargué una OT nueva". datos = lo mismo que el alta normal: { descripcion, tipo, origen, prioridad, lugarId }.
export function crearAltaOrden(usuario, datos, lugarNombre, { ahora = new Date(), numero = nuevoNumero() } = {}) {
  const { descripcion, tipo, origen, prioridad, lugarId } = datos
  return {
    ...base(usuario, ALTA_ORDEN, ahora, numero),
    orden: { descripcion, tipo, origen, prioridad, lugarId },
    descripcion,
    lugarNombre,
  }
}

// Lo que viaja al servidor (el número de comanda va en la dirección, no acá)
export function cuerpoDeEnvio(operacion) {
  if (operacion.tipo === ALTA_ORDEN) return { orden: operacion.orden, hechoEn: operacion.creadaEn }
  return {
    ordenId: operacion.ordenId,
    estadoId: operacion.estadoId,
    estadoAnteriorId: operacion.estadoAnteriorId,
    hechoEn: operacion.creadaEn,
  }
}

// ¿Qué se hace con un envío que falló?
// - Sin código (fetch no llegó: sin señal) o error del servidor (5xx) → REINTENTAR más tarde.
// - 401 → SESION: no se pierde nada, se espera a que la misma persona vuelva a entrar.
// - Cualquier otro (400, 403, 404, 409) → CONFLICTO: el cambio ya no vale tal cual; decide la persona.
export function clasificarError(error) {
  const estado = error?.estado
  if (typeof estado !== 'number') return REINTENTAR
  if (estado === 401) return SESION
  if (estado >= 500 || estado === 408 || estado === 429) return REINTENTAR
  return CONFLICTO
}

// El 409 del backend trae en "errores" el motivo y si se puede "aplicar igual" (todo como texto)
export function conflictoDesdeError(error) {
  const errores = error?.errores ?? {}
  return {
    mensaje: error?.message || 'El servidor no aceptó este cambio.',
    motivo: errores.motivo ?? null,
    sePuedeAplicar: errores.sePuedeAplicar === 'true',
    estadoActualId: errores.estadoActualId != null ? Number(errores.estadoActualId) : null,
    estadoActual: errores.estadoActual ?? null,
  }
}

export function marcarConflicto(operacion, conflicto) {
  return { ...operacion, estado: CONFLICTO, conflicto }
}

export function sumarIntento(operacion, ahora = new Date()) {
  return { ...operacion, intentos: operacion.intentos + 1, ultimoIntento: ahora.toISOString() }
}

// "Aplicar igual": la misma acción, ahora sabiendo en qué estado está la OT.
// Número de comanda NUEVO (la vieja ya tiene su respuesta guardada en el servidor),
// pero conserva su lugar en el cuaderno (creadaEn) para no desordenar los cambios que venían después.
export function aplicarIgual(operacion, { numero = nuevoNumero() } = {}) {
  return {
    ...operacion,
    operacionId: numero,
    estadoAnteriorId: operacion.conflicto?.estadoActualId ?? operacion.estadoAnteriorId,
    estadoAnteriorNombre: operacion.conflicto?.estadoActual ?? operacion.estadoAnteriorNombre,
    estado: PENDIENTE,
    conflicto: null,
    intentos: 0,
  }
}

// El cuaderno se lee en el orden en que se escribió
export function ordenarCola(cola) {
  return [...cola].sort((a, b) => a.creadaEn.localeCompare(b.creadaEn) || a.operacionId.localeCompare(b.operacionId))
}

// El próximo renglón a mandar. Un cambio espera si ANTES hay un conflicto sin resolver de la MISMA OT
// (ej: "Iniciar" chocó: no tiene sentido mandar "Finalizar" hasta que la persona decida qué hacer).
export function siguienteParaEnviar(cola) {
  const ordenada = ordenarCola(cola)
  return ordenada.find((operacion, i) => operacion.estado === PENDIENTE
    && !(operacion.tipo === CAMBIO_ESTADO && ordenada.slice(0, i).some((anterior) =>
      anterior.estado === CONFLICTO && anterior.tipo === CAMBIO_ESTADO && anterior.ordenId === operacion.ordenId))) ?? null
}

// ¿Este renglón está esperando que se resuelva un conflicto anterior de la misma OT?
export function estaEsperando(cola, operacion) {
  return operacion.estado === PENDIENTE && operacion.tipo === CAMBIO_ESTADO
    && cola.some((otra) => otra.estado === CONFLICTO && otra.tipo === CAMBIO_ESTADO && otra.ordenId === operacion.ordenId
      && otra.creadaEn <= operacion.creadaEn && otra.operacionId !== operacion.operacionId)
}

// La lista de OT como la ve la persona: con sus cambios sin enviar ya aplicados ("sinEnviar: true")
// y las OT cargadas sin señal al principio (todavía sin número: id null).
export function aplicarPendientes(ordenes, cola, estados = []) {
  const pendientes = ordenarCola(cola).filter((operacion) => operacion.estado === PENDIENTE)
  const porId = new Map(ordenes.map((orden) => [orden.id, orden]))
  for (const cambio of pendientes.filter((operacion) => operacion.tipo === CAMBIO_ESTADO)) {
    const orden = porId.get(cambio.ordenId)
    if (orden) porId.set(orden.id, { ...orden, estadoId: cambio.estadoId, estadoNombre: cambio.estadoNombre,
      estadoColor: cambio.estadoColor, sinEnviar: true })
  }
  const inicial = estados.find((estado) => estado.inicial)
  const nuevas = pendientes.filter((operacion) => operacion.tipo === ALTA_ORDEN).reverse().map((alta) => ({
    ...alta.orden, id: null, claveLocal: alta.operacionId, lugarNombre: alta.lugarNombre,
    estadoId: inicial?.id ?? null, estadoNombre: inicial?.nombre ?? 'Pendiente', estadoColor: inicial?.color,
    cuadrillaId: null, cuadrillaNombre: null, fechaCreacion: alta.creadaEn, sinEnviar: true,
  }))
  return [...nuevas, ...ordenes.map((orden) => porId.get(orden.id))]
}

export function resumenCola(cola) {
  return {
    pendientes: cola.filter((operacion) => operacion.estado === PENDIENTE).length,
    conflictos: cola.filter((operacion) => operacion.estado === CONFLICTO).length,
  }
}

// Lo leído de IndexedDB puede venir de otra versión o estar roto: solo se usan renglones completos
export function operacionValida(operacion) {
  if (!operacion || typeof operacion.operacionId !== 'string' || !TIPOS.includes(operacion.tipo)
    || operacion.usuarioId == null || !ESTADOS.includes(operacion.estado)
    || !Number.isFinite(Date.parse(operacion.creadaEn))) return false
  return operacion.tipo === CAMBIO_ESTADO
    ? operacion.ordenId != null && operacion.estadoId != null
    : operacion.orden != null && typeof operacion.orden.descripcion === 'string'
}

// ¿Cuántos renglones llegaron bien al servidor entre dos lecturas del cuaderno?
// Los pendientes que se fueron, menos los que no se fueron sino que pasaron a "para revisar".
export function cuantosSeEnviaron(antes, ahora) {
  const salieron = antes.pendientes - ahora.pendientes
  const pasaronARevisar = Math.max(0, ahora.conflictos - antes.conflictos)
  return Math.max(0, salieron - pasaronARevisar)
}
