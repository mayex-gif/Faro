import Icono from './Icono'
import { ORIGENES, PRIORIDADES, TIPOS_TRABAJO, etiqueta, formatearFecha } from '../utils/ordenesTrabajo'

// Props:
// - ordenes: la lista a mostrar
// - idEditando: id de la OT en edición (para resaltar su fila)
// - onEditar: función a llamar al tocar "Editar" (si no se pasa, no se muestra la columna)
// - errorCarga: true si falló la carga (para no decir "no hay órdenes" cuando en realidad hubo un error)
// - estados: los estados posibles, cada uno con "siguientes" (ids de los estados a los que se puede pasar)
// - onCambiarEstado: función a llamar al tocar "Pasar a ..." → onCambiarEstado(orden, estadoNuevo)
// - idCambiandoEstado: id de la OT que está cambiando de estado (sus botones se deshabilitan)
function TablaOrdenes({ ordenes, idEditando, onEditar, errorCarga, estados = [], onCambiarEstado, idCambiandoEstado }) {
  // "Diccionario" id → estado, para encontrar rápido el estado de cada OT
  const estadosPorId = new Map(estados.map((estado) => [estado.id, estado]))

  if (ordenes.length === 0) {
    if (errorCarga) return null
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="orden" /></span>
        <h3>Todavía no hay órdenes de trabajo</h3>
        <p>Cuando registres una orden, vas a poder consultarla y modificarla acá.</p>
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla-ordenes">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-listado-ordenes"
        aria-describedby="ayuda-tabla-ordenes" tabIndex={0}>
        <table className="tabla tabla-ordenes">
          <caption className="solo-lectores">Órdenes de trabajo registradas</caption>
          <thead>
            <tr>
              <th scope="col">Trabajo</th>
              <th scope="col">Lugar</th>
              <th scope="col">Tipo</th>
              <th scope="col">Origen</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Estado</th>
              <th scope="col">Creada</th>
              {onEditar && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => {
              const estadoActual = estadosPorId.get(orden.estadoId)
              const cerrada = Boolean(estadoActual?.cierre)
              // Los estados a los que se puede pasar desde el actual (vacío si está cerrada)
              const siguientes = (estadoActual?.siguientes ?? [])
                .map((id) => estadosPorId.get(id))
                .filter(Boolean)
              const cambiando = orden.id === idCambiandoEstado
              return (
              <tr key={orden.id} className={orden.id === idEditando ? 'fila-editando' : ''}>
                <th scope="row">
                  <span className="nombre-lugar">{orden.descripcion}</span>
                  <span className="numero-orden">OT #{orden.id}</span>
                  {orden.id === idEditando && <span className="marca-edicion">En edición</span>}
                </th>
                <td>{orden.lugarNombre}</td>
                <td><span className="tipo-lugar">{etiqueta(TIPOS_TRABAJO, orden.tipo)}</span></td>
                <td>{etiqueta(ORIGENES, orden.origen)}</td>
                <td>
                  <span className={`estado prioridad-${orden.prioridad.toLowerCase()}`}>
                    <span className="estado-punto" aria-hidden="true" />
                    {etiqueta(PRIORIDADES, orden.prioridad)}
                  </span>
                </td>
                <td>
                  {orden.estadoNombre ? (
                    // El color viene del backend (configurable); el fondo es el mismo color al 10%
                    <span className="estado" style={{ color: orden.estadoColor, background: `${orden.estadoColor}1A` }}>
                      <span className="estado-punto" aria-hidden="true" />
                      {orden.estadoNombre}
                    </span>
                  ) : '—'}
                </td>
                <td className="fecha-tabla">{formatearFecha(orden.fechaCreacion)}</td>
                {onEditar && (
                  <td>
                    <div className="acciones acciones-orden">
                      {!cerrada && (
                        <button type="button" className="boton boton-tabla" onClick={() => onEditar(orden)}
                          aria-label={`Editar la orden ${orden.id}`} disabled={cambiando}>
                          <Icono nombre="editar" />Editar
                        </button>
                      )}
                      {onCambiarEstado && siguientes.map((estado) => (
                        <button key={estado.id} type="button" className="boton boton-tabla boton-estado"
                          onClick={() => onCambiarEstado(orden, estado)} disabled={cambiando}
                          aria-label={`Pasar la orden ${orden.id} a ${estado.nombre}`}>
                          Pasar a {estado.nombre}
                        </button>
                      ))}
                      {cerrada && <span className="orden-cerrada">Cerrada, sin cambios</span>}
                    </div>
                  </td>
                )}
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaOrdenes