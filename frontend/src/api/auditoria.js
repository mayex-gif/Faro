// Funciones para hablar con el backend de Auditoría (trazabilidad de cambios).
// Solo la puede consultar el encargado del corralón: con otro rol el backend responde 403
// (ver AuditoriaController.java y utils/permisos.js → puedeVerAuditoria).
import { pedir } from './cliente.js'

// GET: una página de registros de auditoría, del más reciente al más antiguo.
// filtros (todos opcionales): { accion, tipoRegistro, registroId, actor, desde, hasta }
//   - accion: 'CREACION' | 'MODIFICACION' | 'ELIMINACION'
//   - desde / hasta: fecha-hora ISO ("2026-10-01T00:00:00"), arma parametrosDesde() en utils/auditoria.js
// pagina: desde 0. tamanio: entre 1 y 100.
// Responde { registros, pagina, tamanio, totalRegistros, totalPaginas, primera, ultima }.
export function buscarAuditoria(filtros = {}, pagina = 0, tamanio = 20) {
  const parametros = new URLSearchParams()
  if (filtros.accion) parametros.set('accion', filtros.accion)
  if (filtros.tipoRegistro) parametros.set('tipoRegistro', filtros.tipoRegistro)
  if (filtros.registroId) parametros.set('registroId', filtros.registroId)
  if (filtros.actor) parametros.set('actor', filtros.actor)
  if (filtros.desde) parametros.set('desde', filtros.desde)
  if (filtros.hasta) parametros.set('hasta', filtros.hasta)
  parametros.set('page', String(pagina))
  parametros.set('size', String(tamanio))
  return pedir(`/auditoria?${parametros.toString()}`)
}
