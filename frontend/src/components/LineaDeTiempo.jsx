import Icono from './Icono'
import { agruparPorDia, detalleEvento, horaEvento, nombreDia, ordenDelEvento, tituloEvento } from '../utils/historia'

// Dibuja la historia de un lugar: los eventos agrupados por día, del más nuevo al más viejo.
// Cada evento tiene un punto con el color de su estado, pero el texto siempre dice lo que pasó
// (la guía de estilos pide no depender solo del color).
function LineaDeTiempo({ eventos }) {
  if (eventos.length === 0) {
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="historia" /></span>
        <h3>Este lugar todavía no tiene historia</h3>
        <p>Cuando se registre una orden de trabajo para este lugar,<br />vas a ver acá cada paso que siga.</p>
      </div>
    )
  }

  return (
    <div className="linea-tiempo">
      {agruparPorDia(eventos).map((grupo) => (
        <section key={grupo.dia} className="dia-linea" aria-labelledby={`dia-${grupo.dia}`}>
          <h3 id={`dia-${grupo.dia}`}>
            <time dateTime={grupo.dia}>{nombreDia(grupo.dia)}</time>
          </h3>
          <ol className="eventos-linea">
            {grupo.eventos.map((evento, posicion) => {
              const detalle = detalleEvento(evento)
              return (
                <li key={`${evento.fecha}-${evento.tipo}-${evento.ordenId}-${posicion}`}
                  className={evento.cierre ? 'evento evento-cierre' : 'evento'}>
                  {/* El punto toma el color del estado nuevo; la creación de una OT queda como un círculo vacío */}
                  <span className="evento-punto" aria-hidden="true"
                    style={evento.estadoNuevoColor ? { '--color-evento': evento.estadoNuevoColor } : undefined} />
                  <p className="evento-encabezado">
                    <time dateTime={evento.fecha}>{horaEvento(evento.fecha)}</time>
                    <strong>{tituloEvento(evento)}</strong>
                    {evento.cierre && <span className="marca-cierre">Orden cerrada</span>}
                  </p>
                  {detalle && <p className="evento-detalle">{detalle}</p>}
                  <p className="evento-orden">{ordenDelEvento(evento)}</p>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

export default LineaDeTiempo