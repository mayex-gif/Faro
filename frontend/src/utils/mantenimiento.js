// Lógica de la pantalla "Mantenimiento periódico" (sin React), para poder probarla con "npm test".
// Las mismas reglas las valida el backend: acá solo se avisan antes de mandar el pedido
// (ver ReglaMantenimientoController.java y ReglaMantenimientoRequestDTO.java).
// Tipo de trabajo y prioridad son los mismos enums que una Orden de Trabajo: se reutilizan desde
// utils/ordenesTrabajo.js para no duplicarlos (igual que indica GUIA_ESTILOS.md).
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta, formatearFecha } from './ordenesTrabajo.js'

export { PRIORIDADES, TIPOS_TRABAJO, etiqueta, formatearFecha }

export const FRECUENCIAS = [
  { valor: 'DIARIA', etiqueta: 'Diaria' },
  { valor: 'SEMANAL', etiqueta: 'Semanal' },
  { valor: 'MENSUAL', etiqueta: 'Mensual' },
]

export const DIAS_SEMANA = [
  { valor: '1', etiqueta: 'Lunes' },
  { valor: '2', etiqueta: 'Martes' },
  { valor: '3', etiqueta: 'Miércoles' },
  { valor: '4', etiqueta: 'Jueves' },
  { valor: '5', etiqueta: 'Viernes' },
  { valor: '6', etiqueta: 'Sábado' },
  { valor: '7', etiqueta: 'Domingo' },
]

export const CLASIFICACIONES_DESVIO = [
  { valor: 'A_TIEMPO', etiqueta: 'A tiempo', clase: 'estado-ok' },
  { valor: 'ADELANTADA', etiqueta: 'Adelantada', clase: 'estado-ok' },
  { valor: 'DEMORADA', etiqueta: 'Demorada', clase: 'estado-falla' },
  { valor: 'PENDIENTE_EN_PLAZO', etiqueta: 'Pendiente, en plazo', clase: 'estado-modificacion' },
  { valor: 'PENDIENTE_VENCIDA', etiqueta: 'Pendiente, vencida', clase: 'estado-falla' },
  { valor: 'CANCELADA', etiqueta: 'Cancelada', clase: 'estado-baja' },
]

export function claseClasificacion(valor) {
  return CLASIFICACIONES_DESVIO.find((c) => c.valor === valor)?.clase ?? ''
}

export const FORMULARIO_VACIO = {
  titulo: '', descripcion: '', tipoTrabajo: '', prioridad: '', lugarId: '', cuadrillaId: '',
  frecuencia: '', intervalo: '1', diaSemana: '', diaMes: '', fechaInicio: '', fechaFin: '', activa: true,
}

export function esSemanal(frecuencia) {
  return frecuencia === 'SEMANAL'
}

export function esMensual(frecuencia) {
  return frecuencia === 'MENSUAL'
}

// Datos de una regla existente para editarla.
export function formularioDesde(regla) {
  return {
    titulo: regla.titulo ?? '',
    descripcion: regla.descripcion ?? '',
    tipoTrabajo: regla.tipoTrabajo ?? '',
    prioridad: regla.prioridad ?? '',
    lugarId: regla.lugarId == null ? '' : String(regla.lugarId),
    cuadrillaId: regla.cuadrillaId == null ? '' : String(regla.cuadrillaId),
    frecuencia: regla.frecuencia ?? '',
    intervalo: regla.intervalo == null ? '1' : String(regla.intervalo),
    diaSemana: regla.diaSemana == null ? '' : String(regla.diaSemana),
    diaMes: regla.diaMes == null ? '' : String(regla.diaMes),
    fechaInicio: regla.fechaInicio ?? '',
    fechaFin: regla.fechaFin ?? '',
    activa: regla.activa ?? true,
  }
}

// Devuelve { campo: 'mensaje' } con lo que falta o está mal. Vacío = se puede guardar.
export function validarFormulario(formulario) {
  const errores = {}
  if (!formulario.titulo.trim()) errores.titulo = 'Escribí un título'
  else if (formulario.titulo.trim().length > 150) errores.titulo = 'El título no puede superar los 150 caracteres'
  if (!formulario.descripcion.trim()) errores.descripcion = 'Escribí una descripción'
  else if (formulario.descripcion.trim().length > 500) errores.descripcion = 'La descripción no puede superar los 500 caracteres'
  if (!formulario.tipoTrabajo) errores.tipoTrabajo = 'Elegí el tipo de trabajo'
  if (!formulario.prioridad) errores.prioridad = 'Elegí la prioridad'
  if (!formulario.lugarId) errores.lugarId = 'Elegí el lugar'
  if (!formulario.frecuencia) errores.frecuencia = 'Elegí la frecuencia'

  const intervalo = Number(formulario.intervalo)
  if (!formulario.intervalo || !Number.isInteger(intervalo) || intervalo < 1) errores.intervalo = 'El intervalo tiene que ser un número entero de al menos 1'

  if (esSemanal(formulario.frecuencia) && !formulario.diaSemana) errores.diaSemana = 'Elegí el día de la semana'
  if (esMensual(formulario.frecuencia)) {
    const dia = Number(formulario.diaMes)
    if (!formulario.diaMes || !Number.isInteger(dia) || dia < 1 || dia > 31) errores.diaMes = 'El día del mes tiene que estar entre 1 y 31'
  }

  if (!formulario.fechaInicio) errores.fechaInicio = 'Elegí la fecha de inicio'
  if (formulario.fechaFin && formulario.fechaInicio && formulario.fechaFin < formulario.fechaInicio) {
    errores.fechaFin = 'La fecha de fin tiene que ser posterior o igual a la de inicio'
  }
  return errores
}

// Lo que se manda al backend (ReglaMantenimientoRequestDTO).
export function pedidoDesde(formulario) {
  return {
    titulo: formulario.titulo.trim(),
    descripcion: formulario.descripcion.trim(),
    tipoTrabajo: formulario.tipoTrabajo,
    prioridad: formulario.prioridad,
    lugarId: Number(formulario.lugarId),
    cuadrillaId: formulario.cuadrillaId ? Number(formulario.cuadrillaId) : null,
    frecuencia: formulario.frecuencia,
    intervalo: Number(formulario.intervalo),
    diaSemana: esSemanal(formulario.frecuencia) ? Number(formulario.diaSemana) : null,
    diaMes: esMensual(formulario.frecuencia) ? Number(formulario.diaMes) : null,
    fechaInicio: formulario.fechaInicio,
    fechaFin: formulario.fechaFin || null,
    activa: formulario.activa,
  }
}

// Texto corto de la recurrencia para mostrar en la tabla. Ej.: "Cada 2 semanas, los lunes" / "Cada 3 días" / "Cada mes, el día 15".
export function resumenRecurrencia(regla) {
  const cada = regla.intervalo > 1 ? `Cada ${regla.intervalo}` : 'Cada'
  if (regla.frecuencia === 'DIARIA') return `${cada} ${regla.intervalo > 1 ? 'días' : 'día'}`
  if (regla.frecuencia === 'SEMANAL') {
    const dia = etiqueta(DIAS_SEMANA, String(regla.diaSemana))
    return `${cada} ${regla.intervalo > 1 ? 'semanas' : 'semana'}, los ${dia.toLowerCase()}`
  }
  if (regla.frecuencia === 'MENSUAL') return `${cada} ${regla.intervalo > 1 ? 'meses' : 'mes'}, el día ${regla.diaMes}`
  return '—'
}

// nombre del lugar/cuadrilla a partir de su id (para los desplegables del formulario, igual que en usuarios.js).
export function nombreDe(id, lista) {
  if (id == null || id === '') return '—'
  return lista.find((item) => String(item.id) === String(id))?.nombre ?? `#${id}`
}

// texto: busca en título, descripción y lugar (sin importar tildes ni mayúsculas). estado: 'todas' | 'activas' | 'pausadas'.
export function filtrarReglas(reglas, { texto = '', estado = 'todas' } = {}) {
  const buscado = normalizar(texto.trim())
  return reglas.filter((r) => {
    if (estado === 'activas' && !r.activa) return false
    if (estado === 'pausadas' && r.activa) return false
    if (!buscado) return true
    return normalizar(`${r.titulo} ${r.descripcion} ${r.lugarNombre ?? ''}`).includes(buscado)
  })
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
