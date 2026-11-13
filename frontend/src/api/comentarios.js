// Funciones para hablar con el backend del muro "Comentarios y fotos" de cada OT (tarjetas 16 + 21).
// Pueden usarlo los tres roles; el capataz, solo en las OT de su cuadrilla (si no: 403, o 409 al escribir).
// Un comentario llega como { id, operacionId, ordenId, autorId, autorNombre, autorRol, texto, hechoEn,
// recibidoEn, fotos: [{ id, tipoContenido, tamanio, posicion, url }], puedeBorrar }.
import { pedir, pedirImagen } from './cliente.js'
import { formularioDeComentario } from '../offline/datosCola.js'

// GET: el muro de una OT, del más nuevo al más viejo.
export function listarComentarios(ordenId) {
  return pedir(`/ordenes-trabajo/${ordenId}/comentarios`)
}

// PUT con el número de comanda en la dirección (como /api/sincronizacion): si llega dos veces, se guarda una sola.
// Va como formulario (FormData) porque lleva archivos: "texto", "hechoEn" y una parte "fotos" por cada foto.
// Las fotos tienen que venir ya achicadas (ver utils/fotos.js).
// Respuestas: 200 con el comentario; 400 si falta texto/foto o una foto no es imagen; 409 si la OT ya no existe
// o ya no es de la cuadrilla (errores.motivo); 413 si las fotos pesan demasiado; 503 si el almacén no responde.
export function publicarComentario(ordenId, operacionId, { texto = '', fotos = [], hechoEn = new Date() } = {}) {
  return pedir(`/ordenes-trabajo/${ordenId}/comentarios/${operacionId}`, {
    method: 'PUT',
    body: formularioDeComentario({ texto, fotos, hechoEn }),
  })
}

// El formulario se arma en offline/datosCola.js (lo comparten este envío, el del cuaderno y el service worker)
export { formularioDeComentario }

// GET: los bytes de una foto (un Blob). La pantalla lo muestra con URL.createObjectURL (ver FotoProtegida).
export function bajarFoto(fotoId) {
  return pedirImagen(`/comentarios/fotos/${fotoId}`)
}

// DELETE: borra el comentario con sus fotos. Solo quien lo escribió o el encargado (si no: 403). Responde 204.
export function borrarComentario(id) {
  return pedir(`/comentarios/${id}`, { method: 'DELETE' })
}
