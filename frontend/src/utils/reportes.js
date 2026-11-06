// Lógica del Panel de Reportes e Indicadores (sin React), para poder probarla con "npm test".
// Los nombres de los parámetros y sus valores son los de ReporteController.java.
import { TIPOS_TRABAJO, etiqueta } from './ordenesTrabajo.js'

// Períodos rápidos. El backend acepta HOY, SEMANA, MES o AÑO; "Otras fechas" manda desde/hasta.
export const ATAJOS = [
  { valor: 'HOY', etiqueta: 'Hoy' },
  { valor: 'SEMANA', etiqueta: 'Esta semana' },
  { valor: 'MES', etiqueta: 'Este mes' },
  { valor: 'AÑO', etiqueta: 'Este año' },
  { valor: 'PERSONALIZADO', etiqueta: 'Otras fechas' },
]

export const GRANULARIDADES = [
  { valor: 'DIA', etiqueta: 'Por día' },
  { valor: 'SEMANA', etiqueta: 'Por semana' },
  { valor: 'MES', etiqueta: 'Por mes' },
]

// Al entrar: el mes en curso, agrupado por día (en un mes, "por mes" daría una sola barra).
export const PERIODO_INICIAL = { atajo: 'MES', desde: '', hasta: '', granularidad: 'DIA' }

// La agrupación que mejor se lee para cada período rápido (se puede cambiar a mano después).
export function granularidadSugerida(atajo) {
  return atajo === 'AÑO' ? 'MES' : atajo === 'PERSONALIZADO' ? 'SEMANA' : 'DIA'
}

export function esPersonalizado(periodo) {
  return periodo.atajo === 'PERSONALIZADO'
}

// Con "Otras fechas", ¿están las dos y en orden? (el backend responde 400 si desde > hasta)
export function errorPeriodo(periodo) {
  if (!esPersonalizado(periodo)) return null
  if (!periodo.desde || !periodo.hasta) return 'Elegí las dos fechas: desde y hasta.'
  if (periodo.desde > periodo.hasta) return 'La fecha "desde" tiene que ser anterior o igual a "hasta".'
  return null
}

// Parámetros para el backend. Con un período rápido se manda solo el atajo: el backend calcula las fechas
// con su propio reloj (así "Hoy" es el mismo día para el servidor y para la pantalla).
export function parametrosReporte(periodo, { conGranularidad = true } = {}) {
  const parametros = new URLSearchParams()
  if (esPersonalizado(periodo)) {
    parametros.set('desde', periodo.desde)
    parametros.set('hasta', periodo.hasta)
  } else {
    parametros.set('atajo', periodo.atajo)
  }
  if (conGranularidad && periodo.granularidad) parametros.set('granularidad', periodo.granularidad)
  return parametros
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// "2026-11-06" → "6/11/2026" (sin pasar por Date: así no se corre un día por la zona horaria)
export function formatearDia(fechaIso) {
  if (!fechaIso) return '—'
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return `${dia}/${mes}/${anio}`
}

// Texto del período que efectivamente usó el backend: "1/11/2026 al 6/11/2026" o "6/11/2026"
export function describirRango(desde, hasta) {
  if (!desde) return ''
  return desde === hasta ? formatearDia(desde) : `${formatearDia(desde)} al ${formatearDia(hasta)}`
}

// Etiquetas de la serie temporal. El backend manda "2026-11-06" (día), "2026-W45" (semana ISO) o "2026-11" (mes).
// corta: para el eje del gráfico. larga: para la tabla y el globo al pasar el mouse.
export function etiquetaPeriodo(periodo, { larga = false } = {}) {
  const semana = /^(\d{4})-W(\d{1,2})$/.exec(periodo)
  if (semana) return larga ? `Semana ${Number(semana[2])} de ${semana[1]}` : `Sem. ${Number(semana[2])}`
  const dia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodo)
  if (dia) {
    const [, anio, mes, d] = dia
    return larga ? `${Number(d)} de ${MESES[Number(mes) - 1]} de ${anio}` : `${Number(d)}/${Number(mes)}`
  }
  const mes = /^(\d{4})-(\d{2})$/.exec(periodo)
  if (mes) {
    const nombre = MESES[Number(mes[2]) - 1]
    return larga ? `${nombre[0].toUpperCase()}${nombre.slice(1)} de ${mes[1]}` : `${nombre.slice(0, 3)} ${mes[1].slice(2)}`
  }
  return periodo
}

// Porcentaje entero de una parte sobre un total (0 si no hay total)
export function porcentaje(parte, total) {
  if (!total) return 0
  return Math.round((parte / total) * 100)
}

// Filas para las barras horizontales, de mayor a menor, con el ancho relativo a la más grande.
// items: lo que manda el backend; nombre(item) y valor(item) dicen qué mostrar.
export function filasBarras(items = [], { nombre, valor, color = () => null }) {
  const total = items.reduce((suma, item) => suma + valor(item), 0)
  const maximo = Math.max(0, ...items.map(valor))
  return items
    .map((item) => ({
      nombre: nombre(item),
      valor: valor(item),
      color: color(item),
      ancho: maximo ? (valor(item) / maximo) * 100 : 0,
      parte: porcentaje(valor(item), total),
    }))
    .sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, 'es'))
}

export function nombreTipoTrabajo(tipo) {
  return etiqueta(TIPOS_TRABAJO, tipo)
}

// Marcas del eje vertical: 0 y 3 o 4 valores "redondos" hasta cubrir el máximo (ej. 0, 5, 10, 15)
export function marcasEje(maximo) {
  if (maximo <= 0) return [0, 1]
  const pasoCrudo = maximo / 4
  const potencia = 10 ** Math.floor(Math.log10(pasoCrudo))
  const paso = [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= pasoCrudo)
  const pasoEntero = Math.max(1, Math.round(paso))
  const marcas = []
  for (let valor = 0; valor < maximo + pasoEntero; valor += pasoEntero) marcas.push(valor)
  return marcas
}

// ¿Hay algo para mostrar en el período? (para el estado vacío)
export function tableroVacio(tablero) {
  return !tablero || (tablero.totalOts === 0 && (tablero.resumenDesvios?.totalConPlanificacion ?? 0) === 0)
}
