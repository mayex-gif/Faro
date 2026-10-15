import { useEffect, useState } from 'react'
import { obtenerHistoria } from '../api/infraestructura'
import AsignarCuadrilla from './AsignarCuadrilla'
import Icono from './Icono'
import { esperaCuadrilla } from '../utils/asignacion'
import { lineaNovedad, tituloEvento, ultimasNovedades } from '../utils/historia'
import { describirUbicacion, etiquetaTipoLugar, textoEstadoOperativo } from '../utils/lugares'
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta } from '../utils/ordenesTrabajo'

// Ficha del lugar elegido, en el panel derecho de la pantalla Mapa (no en otra página).
// Muestra los datos del lugar, sus trabajos abiertos y las últimas novedades de su historia.
// Props:
// - resumen: { lugar, ordenes } del lugar (ver agruparPorLugar en utils/mapa.js); ordenes = las abiertas
// - onCerrar(): cerrar el panel
// - onVerHistoria(lugarId): abrir la Ficha histórica completa
// - onNuevaOrden(lugarId): "+ Nueva OT acá" (abre el formulario de OT con este lugar ya elegido)
// - asignacion: { estados, cuadrillas, cargandoCuadrillas, errorCuadrillas, onAsignada(ordenActualizada) }
//   para "Asignar cuadrilla" en los trabajos pendientes que todavía no tienen cuadrilla
// La página lo dibuja con key={lugar.id}: al cambiar de lugar, el panel arranca de cero.
function PanelLugar({ resumen, onCerrar, onVerHistoria, onNuevaOrden, asignacion }) {
  const { lugar, ordenes } = resumen
  const [historia, setHistoria] = useState(null)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0) // cambia con "Volver a cargar" y después de asignar una cuadrilla
  const [aviso, setAviso] = useState('') // "La OT #3 se asignó a ..."

  useEffect(() => {
    let vigente = true // si el usuario elige otro lugar antes de que llegue la respuesta, no se usa
    obtenerHistoria(lugar.id)
      .then((datos) => {
        if (vigente) setHistoria(datos)
      })
      .catch((e) => {
        if (!vigente) return
        console.error(e)
        setError('No pudimos cargar la historia del lugar.')
      })
    return () => { vigente = false }
  }, [lugar.id, intento])

  function recargar() {
    setError(null)
    setIntento((anterior) => anterior + 1)
  }

  // Se asignó una cuadrilla desde una tarjeta: avisamos, la página actualiza la OT y la historia se vuelve a pedir
  // (tiene un evento nuevo).
  function alAsignar(actualizada, cuadrilla) {
    const estadoNuevo = actualizada.estadoNombre ? ` y pasó a "${actualizada.estadoNombre}"` : ''
    setAviso(`La OT #${actualizada.id} se asignó a ${cuadrilla.nombre}${estadoNuevo}.`)
    asignacion.onAsignada(actualizada)
    setIntento((anterior) => anterior + 1)
  }

  const cargando = !historia && !error
  const novedades = historia ? ultimasNovedades(historia.eventos) : []

  return (
    <aside className="panel-lugar" aria-labelledby="titulo-panel-lugar">
      <div className="panel-lugar-cabecera">
        <div className="panel-lugar-datos">
          <p className="panel-lugar-tipo">{etiquetaTipoLugar(lugar.tipo)}</p>
          <h2 id="titulo-panel-lugar">{lugar.nombre}</h2>
          <p className="panel-lugar-estado">
            <span className={lugar.estadoOperativo ? 'estado estado-ok' : 'estado estado-falla'}>
              <span className="estado-punto" aria-hidden="true" />
              {textoEstadoOperativo(lugar.estadoOperativo)}
            </span>
            <span className="ubicacion-tabla">{describirUbicacion(lugar.ubicacion)}</span>
          </p>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label={`Cerrar la ficha de ${lugar.nombre}`}>
          <Icono nombre="cerrar" />
        </button>
        <button type="button" className="boton boton-primario boton-nueva-ot" onClick={() => onNuevaOrden(lugar.id)}>
          <Icono nombre="agregar" />Nueva OT acá
        </button>
      </div>

      <section className="panel-lugar-seccion" aria-labelledby="titulo-trabajos-abiertos">
        <h3 id="titulo-trabajos-abiertos">Trabajos abiertos ({ordenes.length})</h3>
        <div aria-live="polite" aria-atomic="true">
          {aviso && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{aviso}</p>}
        </div>
        {ordenes.length === 0 ? (
          <p className="panel-lugar-vacio">No hay trabajos abiertos en este lugar.</p>
        ) : (
          <ul className="tarjetas-trabajo">
            {ordenes.map((orden) => (
              <li key={orden.id} className="tarjeta-trabajo">
                <span className="tarjeta-trabajo-etiquetas">
                  <span className={`estado prioridad-${orden.prioridad.toLowerCase()}`}>
                    {etiqueta(PRIORIDADES, orden.prioridad)}
                  </span>
                  {orden.estadoNombre && (
                    <span className="estado" style={{ color: orden.estadoColor, background: `${orden.estadoColor}1A` }}>
                      <span className="estado-punto" aria-hidden="true" />
                      {orden.estadoNombre}
                    </span>
                  )}
                </span>
                <strong>{orden.descripcion}</strong>
                <span className="tarjeta-trabajo-detalle">
                  OT #{orden.id} · {etiqueta(TIPOS_TRABAJO, orden.tipo)} · {orden.cuadrillaNombre ? `Cuadrilla: ${orden.cuadrillaNombre}` : 'Sin cuadrilla asignada'}
                </span>
                {esperaCuadrilla(orden, asignacion.estados) && (
                  <AsignarCuadrilla orden={orden} cuadrillas={asignacion.cuadrillas}
                    cargandoCuadrillas={asignacion.cargandoCuadrillas} errorCuadrillas={asignacion.errorCuadrillas}
                    onAsignada={alAsignar} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-lugar-seccion" aria-labelledby="titulo-novedades" aria-busy={cargando}>
        <h3 id="titulo-novedades">Historia del lugar</h3>
        {cargando && <p className="panel-lugar-vacio" role="status">Cargando la historia…</p>}
        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <p>{error}</p>
            <button type="button" className="boton boton-secundario" onClick={recargar}>Volver a cargar</button>
          </div>
        )}
        {historia && novedades.length === 0 && (
          <p className="panel-lugar-vacio">Este lugar todavía no tiene historia.</p>
        )}
        {novedades.length > 0 && (
          <ol className="novedades">
            {novedades.map((evento, posicion) => (
              <li key={`${evento.fecha}-${evento.tipo}-${evento.ordenId}-${posicion}`}>
                {/* El punto repite el color del estado nuevo; el texto siempre dice qué pasó */}
                <span className="novedad-punto" aria-hidden="true"
                  style={evento.estadoNuevoColor ? { '--color-evento': evento.estadoNuevoColor } : undefined} />
                <span className="novedad-texto">
                  <strong>{tituloEvento(evento)}</strong>
                  <span>{lineaNovedad(evento)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <button type="button" className="enlace boton-enlace" onClick={() => onVerHistoria(lugar.id)}>
          Ver toda la historia
        </button>
      </section>
    </aside>
  )
}

export default PanelLugar
