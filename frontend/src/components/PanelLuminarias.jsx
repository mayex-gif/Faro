import { useEffect } from 'react'
import { ESTADOS_LUMINARIA, luminariasDelEstado } from '../utils/luminarias'
import { htmlPoste } from '../utils/poste'

// El poste chiquito de la leyenda y de los conteos. htmlPoste es HTML fijo (no lleva datos de usuarios).
export function MuestraPoste({ estado }) {
  return <span className="muestra-poste" aria-hidden="true" dangerouslySetInnerHTML={{ __html: htmlPoste(estado) }} />
}

// "OT #12 · En curso · Cuadrilla Alumbrado": la OT abierta más urgente de una luminaria en arreglo
function textoDeLaOrden(resumen) {
  const orden = resumen.principal
  if (!orden) return ''
  return [`OT #${orden.id}`, orden.estadoNombre, orden.cuadrillaNombre].filter(Boolean).join(' · ')
}

// Una lista de luminarias de un estado (apagadas, en arreglo, faltan poner). Tocar una la elige en el mapa.
function ListaDelEstado({ id, titulo, ayuda, items, vacio, lugarActivoId, onElegir, conOrden = false }) {
  return (
    <section className="luminarias-seccion" aria-labelledby={id}>
      <h2 id={id}>{titulo} <span className="luminarias-cantidad">({items.length})</span></h2>
      {ayuda && <p className="luminarias-ayuda">{ayuda}</p>}
      {items.length === 0 ? (
        <p className="luminarias-vacio">{vacio}</p>
      ) : (
        <ul className="filas-lugares">
          {items.map(({ resumen, estado }) => {
            const { lugar } = resumen
            const activo = lugar.id === lugarActivoId
            return (
              <li key={lugar.id}>
                <button type="button" id={`fila-luminaria-${lugar.id}`} aria-pressed={activo}
                  className={activo ? 'fila-lugar fila-lugar-activa' : 'fila-lugar'} onClick={() => onElegir(lugar.id)}>
                  <MuestraPoste estado={estado} />
                  <span className="fila-lugar-texto">
                    <strong>{lugar.nombre}</strong>
                    {conOrden && <span>{textoDeLaOrden(resumen)}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// Columna de la izquierda en la pestaña Luminarias: cuánto alumbrado funciona, cuántas hay de cada estado
// y las que hay que mirar (apagadas sin arreglo, en arreglo y las que faltan poner).
// Props:
// - items: [{ resumen, estado }] de todas las luminarias (utils/luminarias.js)
// - totales: resumirLuminarias(items) → { total, cuenta, porcentaje }
// - lugarActivoId, onElegir(lugarId): como en la lista de lugares
function PanelLuminarias({ items, totales, lugarActivoId, onElegir }) {
  useEffect(() => {
    if (lugarActivoId == null) return
    document.getElementById(`fila-luminaria-${lugarActivoId}`)?.scrollIntoView({ block: 'nearest' })
  }, [lugarActivoId])

  const { total, cuenta, porcentaje } = totales

  return (
    <section className="columna-lugares panel-luminarias" aria-labelledby="titulo-luminarias">
      <div className="lugares-encabezado">
        <div className="lugares-titulo">
          <h1 id="titulo-luminarias">Luminarias</h1>
          <span>{total} {total === 1 ? 'cargada' : 'cargadas'}</span>
        </div>

        {porcentaje === null ? (
          <p className="luminarias-porcentaje">Todavía no hay luminarias instaladas.</p>
        ) : (
          <p className="luminarias-porcentaje"><strong>{porcentaje}%</strong> del alumbrado instalado funciona</p>
        )}
        {total > 0 && (
          <div className="luminarias-barra" aria-hidden="true">
            {ESTADOS_LUMINARIA.filter((estado) => cuenta[estado.clave] > 0).map((estado) => (
              <span key={estado.clave} style={{ width: `${(cuenta[estado.clave] * 100) / total}%`, background: estado.color }} />
            ))}
          </div>
        )}

        <ul className="luminarias-conteos" aria-label="Cantidad de luminarias por estado">
          {ESTADOS_LUMINARIA.map((estado) => (
            <li key={estado.clave}>
              <MuestraPoste estado={estado.clave} />
              <strong>{cuenta[estado.clave]}</strong>
              <span>{estado.plural}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="luminarias-listas">
        <ListaDelEstado id="titulo-apagadas" titulo="Apagadas sin arreglo" items={luminariasDelEstado(items, 'apagada')}
          ayuda="No andan y todavía no tienen una OT abierta." vacio="No hay luminarias apagadas sin arreglo."
          lugarActivoId={lugarActivoId} onElegir={onElegir} />
        <ListaDelEstado id="titulo-en-arreglo" titulo="En arreglo" items={luminariasDelEstado(items, 'arreglo')}
          vacio="Ninguna luminaria está en arreglo." lugarActivoId={lugarActivoId} onElegir={onElegir} conOrden />
        <ListaDelEstado id="titulo-faltan-poner" titulo="Faltan poner" items={luminariasDelEstado(items, 'falta')}
          vacio="No hay luminarias pendientes de instalación." lugarActivoId={lugarActivoId} onElegir={onElegir} />
      </div>
    </section>
  )
}

export default PanelLuminarias
