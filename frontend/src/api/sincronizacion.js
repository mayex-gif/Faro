// Funciones para mandar al backend lo que se hizo sin señal ("ventanilla de comandas atrasadas").
// Es PUT con el número de comanda en la dirección: si llega dos veces, el backend lo aplica una sola vez.
// - Cambios de estado y altas de OT: /api/sincronizacion/... con JSON.
// - Comentarios con fotos: el mismo PUT de siempre (/api/ordenes-trabajo/{id}/comentarios/{numero}), como formulario.
// Respuestas: 200; 409 si ya no vale (errores.motivo, errores.sePuedeAplicar...); 401/403 como siempre.
import { pedir } from './cliente.js'
import { pedidoDeEnvio } from '../offline/datosCola.js'

export function enviarOperacion(operacion) {
  const { ruta, body } = pedidoDeEnvio(operacion)
  return pedir(ruta, { method: 'PUT', body }) // pedir no pone Content-Type JSON si el cuerpo es un formulario
}
