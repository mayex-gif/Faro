import { useEffect } from 'react'
import BotoncitosLugares from './BotoncitosLugares'
import Icono from './Icono'
import { subtituloLugar } from '../utils/listaLugares'
import { PRIORIDADES, etiqueta } from '../utils/ordenesTrabajo'

// El icono de cada tipo de lugar (el color de fondo está en estilos-mapa-primero.css)
const ICONO_TIPO = { LUMINARIA: 'luminaria', ESPACIO_VERDE: 'espacioVerde', CALLE: 'calle' }

// Columna izquierda de la pantalla Mapa: título, botoncitos para filtrar y la lista de lugares.
// Cada fila es un botón: al tocarlo se elige el lugar (el mapa va hacia él y se abre su ficha a la derecha).
// Props:
// - resumenes: los lugares que pasan los filtros, ya ordenados (ver utils/mapa.js y utils/listaLugares.js)
// - total: cuántos lugares hay en total (para "3 de 12")
// - filtros / onCambiarFiltros: el estado de los botoncitos ({ conTrabajos, tipos })
// - lugarActivoId / onElegir(lugarId): el lugar elegido
// - mensajeVacio: { titulo, texto, accion?: { texto, alHacer } } cuando la lista queda vacía
// - children: lo que va debajo de los botoncitos (los filtros avanzados, plegados)
// - fueraDeZona / onRevisarFuera(): lugares que no se pueden mostrar en el mapa (sin ubicación o fuera del pueblo)
function ListaLugares({
  resumenes, total, filtros, onCambiarFiltros, lugarActivoId, onElegir, mensajeVacio, children, fueraDeZona = [], onRevisarFuera,
}) {
  // Si el lugar se eligió desde el mapa, la fila se trae a la vista para que se vea cuál es.
  useEffect(() => {
    if (lugarActivoId == null) return
    document.getElementById(`fila-lugar-${lugarActivoId}`)?.scrollIntoView({ block: 'nearest' })
  }, [lugarActivoId])

  return (
    <section className="columna-lugares" aria-labelledby="titulo-lugares">
      <div className="lugares-encabezado">
        <div className="lugares-titulo">
          <h1 id="titulo-lugares">Lugares</h1>
          <span role="status" aria-atomic="true">{resumenes.length} de {total}</span>
        </div>

        <BotoncitosLugares filtros={filtros} onCambiar={onCambiarFiltros} />

        {children}
      </div>

      {/* Lugares mal ubicados: no se dibujan, pero se avisa para que alguien corrija sus coordenadas */}
      {fueraDeZona.length > 0 && (
        <div className="mensaje mensaje-informacion aviso-fuera-de-zona">
          <p>
            <strong>
              {fueraDeZona.length === 1 ? '1 lugar tiene' : `${fueraDeZona.length} lugares tienen`} la ubicación fuera del pueblo
            </strong>{' '}
            y no {fueraDeZona.length === 1 ? 'se muestra' : 'se muestran'} en el mapa: {fueraDeZona.map((lugar) => lugar.nombre).join(', ')}.
          </p>
          {onRevisarFuera && <button type="button" className="boton boton-secundario" onClick={onRevisarFuera}>Revisar en Infraestructura</button>}
        </div>
      )}

      {resumenes.length === 0 ? (
        <div className="estado-listado estado-vacio">
          <span className="icono-vacio"><Icono nombre="mapa" /></span>
          <h2>{mensajeVacio.titulo}</h2>
          <p>{mensajeVacio.texto}</p>
          {mensajeVacio.accion && (
            <button type="button" className="boton boton-secundario" onClick={mensajeVacio.accion.alHacer}>
              {mensajeVacio.accion.texto}
            </button>
          )}
        </div>
      ) : (
        <ul className="filas-lugares" aria-labelledby="titulo-lugares">
          {resumenes.map((resumen) => {
            const { lugar, principal } = resumen
            const activo = lugar.id === lugarActivoId
            return (
              <li key={lugar.id}>
                <button type="button" id={`fila-lugar-${lugar.id}`} aria-pressed={activo}
                  className={activo ? 'fila-lugar fila-lugar-activa' : 'fila-lugar'}
                  onClick={() => onElegir(lugar.id)}>
                  <span className={`icono-tipo icono-tipo-${lugar.tipo.toLowerCase()}`}>
                    <Icono nombre={ICONO_TIPO[lugar.tipo] ?? 'lugar'} />
                  </span>
                  <span className="fila-lugar-texto">
                    <strong>{lugar.nombre}</strong>
                    <span>{subtituloLugar(resumen)}</span>
                  </span>
                  {/* La prioridad más alta del lugar: color y palabra (nunca solo color) */}
                  {principal && (
                    <span className={`estado prioridad-${principal.prioridad.toLowerCase()}`}>
                      {etiqueta(PRIORIDADES, principal.prioridad)}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ListaLugares
