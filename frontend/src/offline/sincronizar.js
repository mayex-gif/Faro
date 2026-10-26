// El "cartero" del cuaderno: manda solo lo que se hizo sin señal cuando vuelve la red.
// Cuándo lo intenta (Safari en iPhone no tiene Background Sync, así que no dependemos de eso):
// - al abrir FARO (o al entrar con la sesión),
// - cuando el celular avisa que volvió la red (evento "online"),
// - cuando se vuelve a la pestaña de FARO (visibilitychange),
// - apenas se anota un cambio nuevo en el cuaderno,
// - y si falló por falta de señal, de nuevo más tarde, esperando cada vez un poco más.
// En Chrome/Android, además, se le pide al navegador que despierte al service worker cuando vuelva la señal
// (Background Sync): así se manda aunque FARO esté cerrado (scripts/envio-segundo-plano.js).
import { enviarOperacion } from '../api/sincronizacion.js'
import { API_BASE } from '../api/cliente.js'
import {
  EVENTO_COLA, guardarOperacion, leerCola, pedirEnvioEnSegundoPlano, quitarOperacion, recordarSesionParaEnvios,
} from './cola.js'
import {
  CONFLICTO, REINTENTAR, SESION, clasificarError, conflictoDesdeError, marcarConflicto, siguienteParaEnviar, sumarIntento,
} from './datosCola.js'
import { leerSesion, tokenVigente } from '../utils/sesion.js'

// Se avisa cada respuesta del servidor (bien o conflicto): la consulta local la usa para poner al día su copia.
// detail = { operacion, respuesta } o { operacion, conflicto }
export const EVENTO_RESPUESTA = 'faro:operacion-respondida'

function avisarRespuesta(detalle) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(EVENTO_RESPUESTA, { detail: detalle }))
  }
}

/**
 * Manda el cuaderno de UNA persona, de a un renglón y en orden, hasta vaciarlo o hasta que algo lo frene.
 * Devuelve { enviadas, conflictos, freno }:
 * - freno null: no quedó nada para mandar (lo que queda son conflictos esperando que la persona decida).
 * - freno REINTENTAR: sin señal o el servidor falló → se vuelve a intentar más tarde.
 * - freno SESION: la sesión no es de esta persona, venció o el servidor respondió 401 → el cuaderno espera intacto.
 * "enviar" se puede reemplazar en los tests.
 */
export async function enviarPendientes(usuario, { enviar = enviarOperacion, ahora = () => new Date() } = {}) {
  let enviadas = 0
  let conflictos = 0
  for (;;) {
    // Nunca se manda con el token de otra persona (ej: si en el mismo celular entró otro)
    const sesion = leerSesion()
    if (usuario?.id == null || String(sesion.usuario?.id) !== String(usuario.id) || !tokenVigente(sesion.token)) {
      return { enviadas, conflictos, freno: SESION }
    }
    const operacion = siguienteParaEnviar(await leerCola(usuario.id))
    if (!operacion) return { enviadas, conflictos, freno: null }
    try {
      const respuesta = await enviar(operacion)
      await quitarOperacion(operacion.operacionId) // llegó: se tacha del cuaderno
      enviadas += 1
      avisarRespuesta({ operacion, respuesta })
    } catch (error) {
      const queHacer = clasificarError(error)
      if (queHacer === CONFLICTO) {
        // Ya no vale tal cual: queda marcado para que la persona decida, y se sigue con el resto
        const conflicto = conflictoDesdeError(error)
        await guardarOperacion(marcarConflicto(operacion, conflicto))
        conflictos += 1
        avisarRespuesta({ operacion, conflicto })
        continue
      }
      if (queHacer === REINTENTAR) await guardarOperacion(sumarIntento(operacion, ahora()))
      // 401: no se toca el renglón (el front ya cerró la sesión); se manda cuando la persona vuelva a entrar
      return { enviadas, conflictos, freno: queHacer === SESION ? SESION : REINTENTAR }
    }
  }
}

// Cuánto esperar antes de reintentar: 30 s, 1 min, 2 min, 4 min… hasta 5 min como máximo.
export function esperaParaReintentar(intento) {
  return Math.min(30000 * 2 ** Math.max(0, intento - 1), 300000)
}

// Si hay varias pestañas de FARO abiertas, manda una sola por vez (Web Locks; si el navegador no lo tiene,
// alcanza con no mandar dos veces a la vez desde la misma pestaña: el número de comanda cubre el resto).
let ocupado = false
async function conCandado(tarea) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks?.request) return locks.request('faro-cola-cambios', { ifAvailable: true }, (candado) => (candado ? tarea() : null))
  if (ocupado) return null
  ocupado = true
  try {
    return await tarea()
  } finally {
    ocupado = false
  }
}

/**
 * Arranca el cartero para la persona que entró. Devuelve la función que lo apaga (para el useEffect de App.jsx).
 * Mientras no hay red (navigator.onLine === false) no intenta: espera el evento "online".
 */
export function iniciarSincronizacion(usuario, { enviar = enviarOperacion } = {}) {
  if (usuario?.id == null || typeof window === 'undefined') return () => {}
  const ventana = window
  const documento = document
  let reloj = null
  let intento = 0
  let apagado = false
  let corriendo = false
  let otraVez = false

  // Si llega un aviso mientras se está mandando (ej: se anotó un cambio justo en ese momento), no se pierde:
  // al terminar se da otra vuelta. Salvo que la vuelta haya terminado sin señal o sin sesión: ahí se espera
  // al reloj o a la red (si no, el propio aviso de "anoté el intento" lo haría girar sin parar).
  async function intentar() {
    if (apagado) return
    if (corriendo) {
      otraVez = true
      return
    }
    corriendo = true
    try {
      let seguir
      do {
        otraVez = false
        seguir = await unaVuelta()
      } while (otraVez && seguir && !apagado)
    } finally {
      corriendo = false
    }
  }

  // Devuelve true si tiene sentido dar otra vuelta enseguida
  async function unaVuelta() {
    ventana.clearTimeout(reloj)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      pedirEnvioEnSegundoPlano() // "despertame cuando vuelva la señal", aunque cierren FARO
      return false
    }
    try {
      const resultado = await conCandado(() => enviarPendientes(usuario, { enviar }))
      if (apagado) return false // se cerró la sesión mientras se mandaba
      if (!resultado) {
        reloj = ventana.setTimeout(intentar, 5000) // otra pestaña de FARO está mandando: se prueba de nuevo en un rato
        return false
      }
      if (resultado.freno === REINTENTAR) {
        pedirEnvioEnSegundoPlano()
        intento += 1
        reloj = ventana.setTimeout(intentar, esperaParaReintentar(intento))
        return false
      }
      intento = 0
      return resultado.freno === null
    } catch (error) {
      // El almacenamiento del navegador falló: no hay nada que mandar desde acá; se reintenta con el próximo aviso
      console.warn('No se pudieron mandar los cambios guardados sin conexión.', error)
      return false
    }
  }

  function alVolverLaRed() {
    intento = 0
    intentar()
  }

  function alVolverALaPestana() {
    if (documento.visibilityState === 'visible') intentar()
  }

  // El service worker necesita con qué cuenta y a qué backend mandar (se borra al cerrar sesión: AuthContext)
  try {
    const apiBase = new URL(API_BASE, ventana.location?.origin ?? 'http://localhost').href.replace(/\/+$/, '')
    recordarSesionParaEnvios({ usuarioId: usuario.id, token: leerSesion().token, apiBase }).catch(() => {})
  } catch { /* sin almacenamiento: queda el cartero de la página */ }

  ventana.addEventListener('online', alVolverLaRed)
  ventana.addEventListener(EVENTO_COLA, intentar)
  documento.addEventListener('visibilitychange', alVolverALaPestana)
  intentar()

  return function apagar() {
    apagado = true
    ventana.clearTimeout(reloj)
    ventana.removeEventListener('online', alVolverLaRed)
    ventana.removeEventListener(EVENTO_COLA, intentar)
    documento.removeEventListener('visibilitychange', alVolverALaPestana)
  }
}
