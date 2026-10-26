/* global leerSesionParaEnvios, olvidarSesionParaEnvios, leerCola, guardarOperacion, quitarOperacion,
   siguienteParaEnviar, cuerpoDeEnvio, clasificarError, conflictoDesdeError, marcarConflicto, sumarIntento,
   ALTA_ORDEN, CONFLICTO, SESION */
// Envío con FARO cerrado (Background Sync, Chrome/Android). Va pegado dentro de sw.js por scripts/armar-sw.js,
// junto con src/offline/datosCola.js y src/offline/cola.js: usa las MISMAS reglas que el cartero de la página.
// Si falla por falta de señal, tira un error: así el navegador lo vuelve a intentar más tarde.

function tokenVencido(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !(exp * 1000 > Date.now())
  } catch {
    return true
  }
}

async function mandarCuaderno() {
  const sesion = await leerSesionParaEnvios()
  // Sin sesión guardada (se cerró) o con el token vencido: el cuaderno espera a que la persona vuelva a entrar
  if (!sesion?.token || !sesion.apiBase || tokenVencido(sesion.token)) return
  for (;;) {
    const operacion = siguienteParaEnviar(await leerCola(sesion.usuarioId))
    if (!operacion) return
    const ruta = operacion.tipo === ALTA_ORDEN ? 'altas-orden' : 'cambios-estado'
    let respuesta
    try {
      respuesta = await fetch(`${sesion.apiBase}/sincronizacion/${ruta}/${operacion.operacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.token}` },
        body: JSON.stringify(cuerpoDeEnvio(operacion)),
      })
    } catch (error) {
      await guardarOperacion(sumarIntento(operacion))
      throw error // sin señal: el navegador vuelve a despertar al worker más tarde
    }
    if (respuesta.ok) {
      await quitarOperacion(operacion.operacionId) // llegó: se tacha del cuaderno
      continue
    }
    let cuerpo = null
    try { cuerpo = await respuesta.json() } catch { /* error sin cuerpo */ }
    const error = { estado: respuesta.status, message: cuerpo?.mensaje ?? `Error ${respuesta.status}`, errores: cuerpo?.errores ?? {} }
    const queHacer = clasificarError(error)
    if (queHacer === CONFLICTO) {
      await guardarOperacion(marcarConflicto(operacion, conflictoDesdeError(error))) // decide la persona al abrir FARO
      continue
    }
    if (queHacer === SESION) {
      await olvidarSesionParaEnvios() // 401: ese token ya no sirve; se manda cuando la persona vuelva a entrar
      return
    }
    await guardarOperacion(sumarIntento(operacion))
    throw new Error(`El servidor respondió ${respuesta.status}`) // 5xx: se reintenta más tarde
  }
}

// Una sola persona manda a la vez: la página y el worker usan el mismo candado (Web Locks)
// eslint-disable-next-line no-unused-vars -- la usa service-worker.js (el build los pega en el mismo sw.js)
function enviarEnSegundoPlano() {
  const locks = self.navigator?.locks
  return locks?.request ? locks.request('faro-cola-cambios', () => mandarCuaderno()) : mandarCuaderno()
}
