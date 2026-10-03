import Icono from './Icono'
import { TIPOS_TRABAJO, etiqueta } from '../utils/ordenesTrabajo'

// Props:
// - cuadrillas: la lista a mostrar
// - errorCarga: true si falló la carga (para no decir "no hay cuadrillas" cuando en realidad hubo un error)
function TablaCuadrillas({ cuadrillas, errorCarga }) {
  if (cuadrillas.length === 0) {
    if (errorCarga) return null
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="cuadrilla" /></span>
        <h3>Todavía no hay cuadrillas registradas</h3>
        <p>Cuando haya cuadrillas registradas, vas a poder asignarles órdenes desde esta pantalla.</p>
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla-cuadrillas">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-cuadrillas"
        aria-describedby="ayuda-tabla-cuadrillas" tabIndex={0}>
        <table className="tabla tabla-cuadrillas">
          <caption className="solo-lectores">Cuadrillas y si están disponibles</caption>
          <thead>
            <tr>
              <th scope="col">Cuadrilla</th>
              <th scope="col">Integrantes</th>
              <th scope="col">Tareas que realiza</th>
              <th scope="col">Disponibilidad</th>
            </tr>
          </thead>
          <tbody>
            {cuadrillas.map((cuadrilla) => (
              <tr key={cuadrilla.id}>
                <th scope="row"><span className="nombre-lugar">{cuadrilla.nombre}</span></th>
                <td>{cuadrilla.integrantes ?? '—'}</td>
                <td>
                  {(cuadrilla.tiposTrabajo ?? []).length === 0 ? '—' : (
                    <ul className="lista-tipos">
                      {cuadrilla.tiposTrabajo.map((tipo) => (
                        <li key={tipo} className="tipo-lugar">{etiqueta(TIPOS_TRABAJO, tipo)}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>
                  <span className={cuadrilla.disponible ? 'estado estado-ok' : 'estado estado-ocupada'}>
                    <span className="estado-punto" aria-hidden="true" />
                    {cuadrilla.disponible ? 'Disponible' : 'Ocupada'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaCuadrillas
