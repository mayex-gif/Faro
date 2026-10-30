// Funciones para mandar al backend lo que se hizo sin señal ("ventanilla de comandas atrasadas").
// Es PUT con el número de comanda en la dirección: si llega dos veces, el backend lo aplica una sola vez.
// Respuestas: 200 con la OT; 409 si ya no vale (errores.motivo, errores.sePuedeAplicar...); 401/403 como siempre.
import { pedir } from './cliente.js'
import { ALTA_ORDEN, cuerpoDeEnvio } from '../offline/datosCola.js'

export function enviarOperacion(operacion) {
  const ruta = operacion.tipo === ALTA_ORDEN ? 'altas-orden' : 'cambios-estado'
  return pedir(`/sincronizacion/${ruta}/${operacion.operacionId}`, {
    method: 'PUT',
    body: JSON.stringify(cuerpoDeEnvio(operacion)),
  })
}
