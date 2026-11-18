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

// Filas para los gráficos de barras y de dona, de mayor a menor, con el % de cada una sobre el total.
// items: lo que manda el backend; nombre(item) y valor(item) dicen qué mostrar.
// ordenar: false respeta el orden recibido (ej. los desvíos, que tienen un orden propio).
export function filasBarras(items = [], { nombre, valor, color = () => null }, { ordenar = true } = {}) {
  const total = items.reduce((suma, item) => suma + valor(item), 0)
  const filas = items.map((item) => ({
    nombre: nombre(item),
    valor: valor(item),
    color: color(item),
    parte: porcentaje(valor(item), total),
  }))
  return ordenar ? filas.sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, 'es')) : filas
}

export function nombreTipoTrabajo(tipo) {
  return etiqueta(TIPOS_TRABAJO, tipo)
}

// Colores de los gráficos (Recharts los pone como atributo SVG, donde var(--x) no funciona: van en hex).
// Son los mismos tokens de index.css: cian y naranja de marca para las series, verde/rojo para el plan.
export const COLORES = {
  creadas: '#1B9FB5', // --marca-cian
  cerradas: '#EA6A25', // --marca-naranja
  barra: '#1B9FB5',
  grilla: '#E6ECEE',
  eje: '#566A73', // --texto-secundario
  sinColor: '#81949D', // --borde-campo: si un estado llega sin color del backend
}

// Serie de "Evolución" lista para el gráfico: cada punto con su etiqueta corta (eje) y larga (globo y tabla).
export function serieEvolucion(serie = []) {
  return serie.map((punto) => ({
    ...punto,
    etiqueta: etiquetaPeriodo(punto.periodo),
    etiquetaLarga: etiquetaPeriodo(punto.periodo, { larga: true }),
  }))
}

// Cómo terminaron las órdenes del plan de mantenimiento, en el orden en que se leen (de lo bueno a lo malo).
// Solo las categorías con órdenes, con su color: verdes = cumplidas, naranja/rojo = desvíos, grises = el resto.
export function filasDesvios(desvios) {
  if (!desvios) return []
  return filasBarras([
    { nombre: 'A tiempo', cantidad: desvios.aTiempo, color: '#22633E' }, // --exito
    { nombre: 'Adelantadas', cantidad: desvios.adelantadas, color: '#5FA77D' },
    { nombre: 'Demoradas', cantidad: desvios.demoradas, color: '#EA6A25' }, // --marca-naranja
    { nombre: 'Pendientes vencidas', cantidad: desvios.pendientesVencidas, color: '#A52A27' }, // --error
    { nombre: 'Pendientes en plazo', cantidad: desvios.pendientesEnPlazo, color: '#566A73' }, // --texto-secundario
    { nombre: 'Canceladas', cantidad: desvios.canceladas, color: '#C3CFD4' },
  ].filter((fila) => fila.cantidad > 0), { nombre: (f) => f.nombre, valor: (f) => f.cantidad, color: (f) => f.color },
  { ordenar: false })
}

// Alto del gráfico de barras horizontales: una franja por fila, con un mínimo para que no quede aplastado.
export function altoBarras(cantidadFilas) {
  return Math.max(120, cantidadFilas * 40 + 24)
}

// ¿Hay algo para mostrar en el período? (para el estado vacío)
export function tableroVacio(tablero) {
  return !tablero || (tablero.totalOts === 0 && (tablero.resumenDesvios?.totalConPlanificacion ?? 0) === 0)
}

// ===================== Montos gastados =====================

// Colores de la serie de montos (validados juntos con el validador de la skill dataviz: se distinguen también
// con daltonismo). Verde = lo declarado al crear la OT; naranja = lo que se gastó en total al finalizarla.
export const COLORES_MONTOS = { declarado: '#1F8A6A', gastado: '#C2571A' }

// Pesos sin centavos para el tablero: "$ 37.000"
export function pesos(valor) {
  return Number(valor ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

// La diferencia con signo para el tablero: "−$ 5.000", "+$ 3.000" o "$ 0" (el signo menos de verdad: "−")
export function pesosConSigno(valor) {
  const numero = Number(valor ?? 0) || 0
  if (Math.round(numero) === 0) return pesos(0)
  return `${numero < 0 ? '\u2212' : '+'}${pesos(Math.abs(numero))}`
}

// Lo gastado en las OT finalizadas del período (lo calcula el backend):
// - declarado: lo que se declaró al crearlas (monto aproximado)
// - gastado: lo que se gastó en total al finalizarlas (si una OT no lo informó, cuenta lo declarado)
// - diferencia: gastado − declarado (negativa = se gastó menos)
export function resumenGastos(tablero) {
  const declarado = Number(tablero?.montoAproximadoTotal ?? 0) || 0
  const gastado = Number(tablero?.gastoRealTotal ?? declarado) || 0
  const diferencia = Number(tablero?.diferenciaGastoTotal ?? gastado - declarado) || 0
  return { declarado, gastado, diferencia }
}

// La serie del gráfico de montos: lo declarado, lo gastado y la diferencia de cada período, con sus etiquetas
export function serieMontos(serie = []) {
  return serie.map((punto) => {
    const declarado = Number(punto.montoAproximado ?? 0) || 0
    const gastado = Number(punto.gastoReal ?? declarado) || 0
    return {
      periodo: punto.periodo,
      declarado,
      gastado,
      diferencia: Number(punto.diferencia ?? gastado - declarado) || 0,
      etiqueta: etiquetaPeriodo(punto.periodo),
      etiquetaLarga: etiquetaPeriodo(punto.periodo, { larga: true }),
    }
  })
}

// ===================== Luminarias: nuevas y viejas =====================
// La sección "Luminarias" de Reportes. El backend manda tablero.luminarias = { total, aFuturo, grupos: [...] }, con
// siempre tres grupos ("nueva", "vieja", "sinMarcar"): cómo están HOY (cantidad, funcionan, apagadas, enArreglo)
// y lo del PERÍODO elegido (otsDelPeriodo, gastoDelPeriodo).

// Colores de las barras (validados juntos con el validador de la skill dataviz, sobre fondo blanco: pasan las seis
// pruebas, también con daltonismo). Azul = nuevas (como la luz LED del mapa), naranja = viejas (la luz de sodio).
// "Sin marcar" no va en el gráfico: se muestra en los números y en las tablas.
export const COLORES_LUMINARIAS = { nueva: '#2A78D6', vieja: '#EB6834' }

const NOMBRES_GRUPO = { nueva: 'Nuevas', vieja: 'Viejas', sinMarcar: 'Sin marcar' }
const ESTADOS_GRUPO = [
  { clave: 'funcionan', nombre: 'Funcionan' },
  { clave: 'apagadas', nombre: 'Apagadas' },
  { clave: 'enArreglo', nombre: 'En arreglo' },
]

function grupoVacio(clave) {
  return { clave, cantidad: 0, funcionan: 0, apagadas: 0, enArreglo: 0, otsDelPeriodo: 0, gastoDelPeriodo: 0 }
}

// Todo lo que muestra la sección, ya calculado. null si no hay ninguna luminaria cargada (la sección no se muestra).
export function resumenLuminarias(tablero) {
  const datos = tablero?.luminarias
  if (!datos || !datos.total) return null
  const porClave = Object.fromEntries((datos.grupos ?? []).map((grupo) => [grupo.clave, grupo]))
  const grupo = (clave) => ({ ...grupoVacio(clave), ...porClave[clave], nombre: NOMBRES_GRUPO[clave] })
  const nueva = grupo('nueva')
  const vieja = grupo('vieja')
  const sinMarcar = grupo('sinMarcar')
  // Los grupos que van en las tablas: nuevas y viejas siempre; "Sin marcar" solo si hay alguna
  const grupos = sinMarcar.cantidad > 0 ? [nueva, vieja, sinMarcar] : [nueva, vieja]

  // Los números de arriba: cuántas hay de cada una, con su parte del total (las a futuro también cuentan en el total)
  const tarjetas = [
    ...grupos.map((g) => ({ clave: g.clave, nombre: g.nombre, cantidad: g.cantidad })),
    { clave: 'aFuturo', nombre: 'A futuro', cantidad: datos.aFuturo ?? 0 },
  ].map((tarjeta) => ({ ...tarjeta, porcentaje: porcentaje(tarjeta.cantidad, datos.total) }))

  // El gráfico "Cómo están hoy": una fila por estado, con las nuevas y las viejas una al lado de la otra
  const estados = ESTADOS_GRUPO.map((estado) => ({
    clave: estado.clave, nombre: estado.nombre, nueva: nueva[estado.clave], vieja: vieja[estado.clave],
    sinMarcar: sinMarcar[estado.clave],
  }))

  return { total: datos.total, aFuturo: datos.aFuturo ?? 0, grupos, tarjetas, estados }
}

// Cuántas veces hubo que ir, por luminaria del grupo: 6 OT en 5 viejas → "1,2". Sin luminarias en el grupo → "—".
// Sirve para comparar grupos de distinto tamaño (40 nuevas no se comparan con 75 viejas por el total de OT).
export function otsPorLuminaria(grupo) {
  if (!grupo?.cantidad) return '—'
  return (grupo.otsDelPeriodo / grupo.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// "40 nuevas · 75 viejas · 10 a futuro" (para el lector de pantalla y el resumen del gráfico)
export function textoCantidadesLuminarias(resumen) {
  return resumen.tarjetas.map((t) => `${t.cantidad} ${t.nombre.toLowerCase()}`).join(' · ')
}
