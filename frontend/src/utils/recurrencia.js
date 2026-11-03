import { FORMULARIO_VACIO, pedidoDesde, validarFormulario } from './mantenimiento.js'

export function hoyArgentina(fecha = new Date()) {
  return fecha.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

export function recurrenciaInicial() {
  return { habilitada: false, titulo: '', frecuencia: '', intervalo: '1', diaSemana: '', diaMes: '', fechaInicio: hoyArgentina(), fechaFin: '' }
}

// La regla toma los datos comunes de la OT. Su origen lo fija el motor como PLAN_MANTENIMIENTO.
export function formularioDeProgramacion(orden, recurrencia) {
  return { ...FORMULARIO_VACIO, ...recurrencia, descripcion: orden.descripcion, tipoTrabajo: orden.tipo,
    prioridad: orden.prioridad, lugarId: orden.lugarId, cuadrillaId: '', activa: true }
}

export function pedidoDeProgramacion(orden, recurrencia) {
  return pedidoDesde(formularioDeProgramacion(orden, recurrencia))
}

export function validarProgramacion(orden, recurrencia, hoy = hoyArgentina()) {
  const errores = validarFormulario(formularioDeProgramacion(orden, recurrencia))
  if (errores.tipoTrabajo) { errores.tipo = errores.tipoTrabajo; delete errores.tipoTrabajo }
  if (!['DIARIA', 'SEMANAL', 'MENSUAL'].includes(recurrencia.frecuencia)) errores.frecuencia = 'Elegí la frecuencia'
  if (recurrencia.frecuencia === 'SEMANAL' && !/^[1-7]$/.test(String(recurrencia.diaSemana))) errores.diaSemana = 'Elegí un día de la semana'
  if (!fechaValida(recurrencia.fechaInicio)) errores.fechaInicio = 'Elegí una fecha de inicio válida'
  else if (recurrencia.fechaInicio < hoy) errores.fechaInicio = 'La programación nueva debe comenzar hoy o más adelante'
  if (recurrencia.fechaFin && !fechaValida(recurrencia.fechaFin)) errores.fechaFin = 'Elegí una fecha de fin válida'
  const primera = primeraFecha(recurrencia)
  if (primera && recurrencia.fechaFin && primera > recurrencia.fechaFin) errores.fechaFin = 'La fecha de fin debe incluir al menos una ejecución'
  return errores
}

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '') && Number.isFinite(Date.parse(fecha))
    && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha
}

// Vista previa de CalculadorRecurrencia.calcularPrimeraEjecucion. El servidor confirma la fecha al guardar.
// UTC solo evita que el huso horario del navegador cambie el día elegido.
export function primeraFecha({ frecuencia, fechaInicio, diaSemana, diaMes }) {
  if (!fechaValida(fechaInicio)) return null
  const fecha = new Date(`${fechaInicio}T00:00:00Z`)
  if (frecuencia === 'DIARIA') return fechaInicio
  if (frecuencia === 'SEMANAL' && /^[1-7]$/.test(String(diaSemana))) {
    fecha.setUTCDate(fecha.getUTCDate() + (Number(diaSemana) - (fecha.getUTCDay() || 7) + 7) % 7)
    return fecha.toISOString().slice(0, 10)
  }
  if (frecuencia === 'MENSUAL' && Number.isInteger(Number(diaMes)) && Number(diaMes) >= 1 && Number(diaMes) <= 31) {
    const candidato = (mes) => {
      const ultimoDia = new Date(Date.UTC(fecha.getUTCFullYear(), mes + 1, 0)).getUTCDate()
      return new Date(Date.UTC(fecha.getUTCFullYear(), mes, Math.min(Number(diaMes), ultimoDia)))
    }
    let primera = candidato(fecha.getUTCMonth())
    if (primera < fecha) primera = candidato(fecha.getUTCMonth() + 1)
    return primera.toISOString().slice(0, 10)
  }
  return null
}

export function fechaProgramada(fecha) {
  return fechaValida(fecha) ? fecha.split('-').reverse().join('/') : 'a confirmar por el servidor'
}
