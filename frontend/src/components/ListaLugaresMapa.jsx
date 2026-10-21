import Icono from './Icono'
import { NOMBRES_TIPO_LUGAR, etiquetaPrioridad } from '../utils/mapa'

// Lista en texto de los mismos lugares que se ven en el mapa, con acciones
// para centrar el mapa en uno de ellos o ir a su ficha histórica.
function ListaLugaresMapa({
  lugaresMapa, lugaresVisiblesEnMapa, soloVisibles, onSoloVisiblesCambio, onVerEnMapa, onFichaHistorica,
}) {
  const lugaresAMostrar = soloVisibles && lugaresVisiblesEnMapa
    ? lugaresMapa.filter(({ lugar }) => lugaresVisiblesEnMapa.has(lugar.id))
    : lugaresMapa

  return (
    <section className="panel listado lista-mapa" aria-labelledby="titulo-lista-mapa">
      <div className="panel-encabezado">
        <div>
          <h2 id="titulo-lista-mapa">Lugares en el mapa</h2>
          <p>Los mismos datos del mapa, en formato de lista.</p>
        </div>
        <label className="campo-check campo-check-inline" htmlFor="mapa-solo-visibles">
          <input id="mapa-solo-visibles" name="soloVisibles" type="checkbox"
            checked={soloVisibles} onChange={(evento) => onSoloVisiblesCambio(evento.target.checked)} />
          <span>Mostrar solo lo que se ve en el mapa</span>
        </label>
      </div>

      {lugaresAMostrar.length === 0 ? (
        <div className="estado-listado estado-vacio">
          <span className="icono-vacio"><Icono nombre="lugar" /></span>
          <h3>No hay lugares para mostrar</h3>
          <p>Probá moverte por el mapa, alejar el zoom o ajustar los filtros de órdenes.</p>
        </div>
      ) : (
        <>
          <p className="ayuda-tabla" id="ayuda-tabla-mapa">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
          <div className="tabla-contenedor" role="region" aria-labelledby="titulo-lista-mapa"
            aria-describedby="ayuda-tabla-mapa" tabIndex={0}>
            <table className="tabla">
              <caption className="solo-lectores">Lugares mostrados en el mapa</caption>
              <thead>
                <tr>
                  <th scope="col">Lugar</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">OT abierta más urgente</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lugaresAMostrar.map(({ lugar, ordenUrgente, estadoUrgente, color }) => (
                  <tr key={lugar.id}>
                    <th scope="row">
                      <span className="nombre-lugar">{lugar.nombre}</span>
                    </th>
                    <td><span className="tipo-lugar">{NOMBRES_TIPO_LUGAR[lugar.tipo] ?? lugar.tipo}</span></td>
                    <td>
                      {ordenUrgente ? (
                        <span className="estado" style={{ color, background: `${color}1A` }}>
                          <span className="estado-punto" aria-hidden="true" />
                          {`OT #${ordenUrgente.id} · ${etiquetaPrioridad(ordenUrgente.prioridad)} · ${estadoUrgente?.nombre ?? '—'}`}
                        </span>
                      ) : (
                        <span className="estado estado-ok">
                          <span className="estado-punto" aria-hidden="true" />
                          Sin órdenes abiertas
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="acciones">
                        <button type="button" className="boton boton-tabla" onClick={() => onVerEnMapa(lugar.id)}
                          aria-label={`Ver ${lugar.nombre} en el mapa`}>
                          <Icono nombre="lugar" />Ver en el mapa
                        </button>
                        <button type="button" className="boton boton-tabla" onClick={() => onFichaHistorica(lugar.id)}
                          aria-label={`Ver ficha histórica de ${lugar.nombre}`}>
                          <Icono nombre="orden" />Ficha histórica
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default ListaLugaresMapa
