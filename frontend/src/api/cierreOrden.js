// Lo que se manda al tocar "Finalizar" en el pop-up de cierre de una OT (las reglas están en utils/cierreOrden.js).
// Son DOS pedidos, en este orden:
//   1. El comentario con las fotos de evidencia (si hay). Va con su número de comanda: si se reintenta, no se duplica.
//   2. El cambio de estado con la casilla "El lugar quedó funcionando" y el gasto adicional.
// Primero el comentario: si falla, la OT sigue abierta y se puede corregir y reintentar sin perder nada.
// Si el comentario llegó y falla el cambio de estado, al reintentar el comentario no se repite (mismo número).
import { pedir } from './cliente.js'
import { publicarComentario } from './comentarios.js'

// cierre = { cambio: { estadoId, lugarFunciona?, gastoAdicional? }, comentario: { texto, fotos } | null, numeroComentario }
// Devuelve { orden (la OT como quedó), comentario (el publicado, o null) }.
// Si algo falla, el error dice en qué parte falló (error.etapa = 'comentario' o 'estado').
export async function enviarCierre(ordenId, { cambio, comentario = null, numeroComentario }, { ahora = new Date() } = {}) {
  let publicado = null
  if (comentario) {
    try {
      publicado = await publicarComentario(ordenId, numeroComentario, { ...comentario, hechoEn: ahora })
    } catch (error) {
      error.etapa = 'comentario'
      throw error
    }
  }
  try {
    const orden = await pedir(`/ordenes-trabajo/${ordenId}/estado`, { method: 'PATCH', body: JSON.stringify(cambio) })
    return { orden, comentario: publicado }
  } catch (error) {
    error.etapa = 'estado'
    error.conComentario = publicado != null
    throw error
  }
}
