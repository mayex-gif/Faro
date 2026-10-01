import Icono from './Icono'
import { ORIGENES, PRIORIDADES, TIPOS_TRABAJO, etiqueta, formatearFecha } from '../utils/ordenesTrabajo'

// Props:
// - ordenes: la lista a mostrar
// - idEditando: id de la OT en edición (para resaltar su fila)
// - onEditar: función a llamar al tocar "Editar" (si no se pasa, no se muestra la columna)
// - errorCarga: true si falló la carga (para no decir "no hay órdenes" cuando en realidad hubo un error)
function TablaOrdenes({ ordenes, idEditando, onEditar, errorCarga }) {
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
        <table className="tabla">
          <caption className="solo-lectores">Órdenes de trabajo registradas</caption>
          <thead>
            <tr>
              <th scope="col">Trabajo</th>
              <th scope="col">Lugar</th>
              <th scope="col">Tipo</th>
              <th scope="col">Origen</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Creada</th>
              {onEditar && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => (
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
                <td className="fecha-tabla">{formatearFecha(orden.fechaCreacion)}</td>
                {onEditar && (
                  <td>
                    <button type="button" className="boton boton-tabla" onClick={() => onEditar(orden)}
                      aria-label={`Editar la orden ${orden.id}`}>
                      <Icono nombre="editar" />Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaOrdenes