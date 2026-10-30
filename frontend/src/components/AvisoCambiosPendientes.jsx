import { useState } from 'react'
import Icono from './Icono'
import { guardarOperacion, quitarOperacion } from '../offline/cola'
import { ALTA_ORDEN, CONFLICTO, PENDIENTE, aplicarIgual, estaEsperando } from '../offline/datosCola'
import '../estilos-cola.css'

// El cartel del cuaderno: lo que se hizo sin señal y todavía no llegó, y lo que llegó pero ya no valía.
// Props: cola = los renglones de la persona (useColaCambios). Si no hay nada, no se muestra.
// Decisión del equipo (26/10): ante un conflicto decide la persona, pero solo si todavía se puede
// ("Aplicar igual" o "Descartar"); si ya no se puede (OT cerrada, de otra cuadrilla, borrada) solo "Entendido".

function queSeHizo(operacion) {
  return operacion.tipo === ALTA_ORDEN
    ? `OT nueva: ${operacion.descripcion}`
    : `OT #${operacion.ordenId}: pasar a ${operacion.estadoNombre}`
}

function cuando(fecha) {
  return new Date(fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function AvisoCambiosPendientes({ cola }) {
  const [error, setError] = useState('')
  const [resolviendo, setResolviendo] = useState(null)
  const pendientes = cola.filter((operacion) => operacion.estado === PENDIENTE)
  const conflictos = cola.filter((operacion) => operacion.estado === CONFLICTO)
  if (pendientes.length === 0 && conflictos.length === 0) return null

  async function resolver(operacion, accion) {
    setError('')
    setResolviendo(operacion.operacionId)
    try {
      await accion()
    } catch {
      setError('No se pudo guardar tu decisión en este celular. Intentá nuevamente.')
    } finally {
      setResolviendo(null)
    }
  }

  // Primero se anota la versión nueva y después se borra la vieja: si algo falla en el medio, no se pierde nada
  const aplicar = (operacion) => resolver(operacion, async () => {
    await guardarOperacion(aplicarIgual(operacion))
    await quitarOperacion(operacion.operacionId)
  })
  const descartar = (operacion) => resolver(operacion, () => quitarOperacion(operacion.operacionId))

  return (
    <section className="panel aviso-cola" aria-labelledby="titulo-aviso-cola">
      <h2 id="titulo-aviso-cola" className="solo-lectores">Cambios guardados en este celular</h2>

      {conflictos.length > 0 && <div className="aviso-cola-bloque aviso-cola-revisar">
        <h3><Icono nombre="editar" />{conflictos.length === 1 ? '1 cambio para revisar' : `${conflictos.length} cambios para revisar`}</h3>
        <p>Mientras no tenías señal, el trabajo cambió. Tu cambio no se aplicó: decidí qué hacer.</p>
        <ul className="aviso-cola-lista">
          {conflictos.map((operacion) => (
            <li key={operacion.operacionId} className="aviso-cola-item">
              <div className="aviso-cola-texto">
                <strong>{queSeHizo(operacion)}</strong>
                <span>{operacion.lugarNombre} · {cuando(operacion.creadaEn)}</span>
                <p role="alert">{operacion.conflicto?.mensaje}</p>
              </div>
              <div className="aviso-cola-acciones">
                {operacion.conflicto?.sePuedeAplicar ? <>
                  <button type="button" className="boton boton-primario" disabled={resolviendo != null}
                    onClick={() => aplicar(operacion)} aria-label={`Aplicar igual: ${queSeHizo(operacion)}`}>
                    Aplicar igual
                  </button>
                  <button type="button" className="boton boton-secundario" disabled={resolviendo != null}
                    onClick={() => descartar(operacion)} aria-label={`Descartar: ${queSeHizo(operacion)}`}>
                    Descartar
                  </button>
                </> : <button type="button" className="boton boton-secundario" disabled={resolviendo != null}
                  onClick={() => descartar(operacion)} aria-label={`Entendido: ${queSeHizo(operacion)}`}>
                  Entendido
                </button>}
              </div>
            </li>
          ))}
        </ul>
      </div>}

      {pendientes.length > 0 && <div className="aviso-cola-bloque">
        <h3><Icono nombre="historial" />{pendientes.length === 1 ? '1 cambio sin enviar' : `${pendientes.length} cambios sin enviar`}</h3>
        <p>Están guardados en este celular y se envían solos cuando vuelva la señal. Si cerrás sesión no se pierden: se envían cuando vuelvas a entrar.</p>
        <ul className="aviso-cola-lista">
          {pendientes.map((operacion) => (
            <li key={operacion.operacionId} className="aviso-cola-item">
              <div className="aviso-cola-texto">
                <strong>{queSeHizo(operacion)}</strong>
                <span>{operacion.lugarNombre} · {cuando(operacion.creadaEn)}</span>
                {estaEsperando(cola, operacion) && <p>Espera a que revises el cambio anterior de esta OT.</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>}

      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
    </section>
  )
}

export default AvisoCambiosPendientes
