// Funciones para hablar con el backend del Panel de Reportes e Indicadores (Sprint 4, RF10).
// Solo lo consulta el encargado del corralón: con otro rol el backend responde 403
// (ver ReporteController.java y utils/permisos.js → puedeVerReportes).
import { pedir, pedirArchivo } from './cliente.js'

// GET: indicadores del período. parametros: el URLSearchParams que arma parametrosReporte() en utils/reportes.js
// Responde { desde, hasta, granularidad, totalOts, otsCerradas, otsPendientes, otsPorEstado, otsPorTipoTrabajo,
//            otsPorCuadrilla, otsPorPeriodo, resumenDesvios }.
export function obtenerTablero(parametros) {
  return pedir(`/reportes/dashboard?${parametros.toString()}`)
}

// GET: CSV con las OT finalizadas del período. Devuelve { contenido (Blob), nombre }.
export function descargarOrdenesResueltas(parametros) {
  return pedirArchivo(`/reportes/ots-resueltas/csv?${parametros.toString()}`, 'ots-resueltas.csv')
}

// GET: CSV con los desvíos del plan de mantenimiento (planificado vs. ejecutado). Devuelve { contenido (Blob), nombre }.
export function descargarDesvios(parametros) {
  return pedirArchivo(`/reportes/desvios/csv?${parametros.toString()}`, 'desvios.csv')
}
