import Icono from './Icono'
import { etiqueta, resumenRecurrencia, PRIORIDADES, TIPOS_TRABAJO } from '../utils/mantenimiento'

// Listado de reglas de mantenimiento periódico, con sus acciones: editar, ejecutar ya, pausar/activar,
// ver desvíos y borrar (solo si todavía no generó ninguna OT: si no, hay que pausarla).
function TablaReglas({ reglas, idEditando, ocupado, mensajeVacio, onEditar, onEjecutar, onPausar, onActivar, onBorrar, onVerDesvios }) {
  if (reglas.length === 0) {
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="mantenimiento" /></span>
        <h3>{mensajeVacio}</h3>
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla-reglas">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-listado-reglas"
        aria-describedby="ayuda-tabla-reglas" tabIndex={0}>
        <table className="tabla tabla-reglas">
          <caption className="solo-lectores">Reglas de mantenimiento periódico, con su recurrencia y estado</caption>
          <thead>
            <tr>
              <th scope="col">Regla</th>
              <th scope="col">Lugar</th>
              <th scope="col">Tipo / prioridad</th>
              <th scope="col">Recurrencia</th>
              <th scope="col">Próxima ejecución</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reglas.map((regla) => {
              const clases = [regla.id === idEditando ? 'fila-editando' : '', regla.activa ? '' : 'fila-de-baja'].join(' ').trim()
              return (
                <tr key={regla.id} className={clases}>
                  <th scope="row">
                    <span className="nombre-regla">{regla.titulo}</span>
                    {regla.id === idEditando && <span className="marca-edicion">En edición</span>}
                  </th>
                  <td className="datos-tabla">{regla.lugarNombre ?? '—'}</td>
                  <td>
                    <span className="tipo-lugar">{etiqueta(TIPOS_TRABAJO, regla.tipoTrabajo)}</span>
                    <span className={`prioridad-${regla.prioridad?.toLowerCase()}`} style={{ display: 'block', marginTop: 6 }}>
                      {etiqueta(PRIORIDADES, regla.prioridad)}
                    </span>
                  </td>
                  <td className="datos-tabla">{resumenRecurrencia(regla)}</td>
                  <td className="fecha-tabla">{regla.activa ? (regla.proximaEjecucion ?? '—') : 'Pausada'}</td>
                  <td>
                    <span className={regla.activa ? 'estado estado-ok' : 'estado estado-baja'}>
                      <span className="estado-punto" aria-hidden="true" />
                      {regla.activa ? 'Activa' : 'Pausada'}
                    </span>
                  </td>
                  <td>
                    <div className="acciones acciones-regla">
                      <button type="button" className="boton boton-tabla" onClick={() => onEditar(regla)} disabled={ocupado}
                        aria-label={`Editar ${regla.titulo}`}>
                        <Icono nombre="editar" />Editar
                      </button>
                      <button type="button" className="boton boton-tabla" onClick={() => onVerDesvios(regla)} disabled={ocupado}
                        aria-label={`Ver desvíos de ${regla.titulo}`}>
                        <Icono nombre="historial" />Desvíos
                      </button>
                      {regla.activa ? (
                        <>
                          <button type="button" className="boton boton-tabla" onClick={() => onEjecutar(regla)} disabled={ocupado}
                            aria-label={`Generar ya la próxima OT de ${regla.titulo}`}>
                            <Icono nombre="iniciar" />Generar ya
                          </button>
                          <button type="button" className="boton boton-tabla" onClick={() => onPausar(regla)} disabled={ocupado}
                            aria-label={`Pausar ${regla.titulo}`}>
                            <Icono nombre="baja" />Pausar
                          </button>
                        </>
                      ) : (
                        <button type="button" className="boton boton-tabla" onClick={() => onActivar(regla)} disabled={ocupado}
                          aria-label={`Reactivar ${regla.titulo}`}>
                          <Icono nombre="guardar" />Reactivar
                        </button>
                      )}
                      <button type="button" className="boton boton-tabla boton-borrar" onClick={() => onBorrar(regla)} disabled={ocupado}
                        aria-label={`Borrar ${regla.titulo}`}>
                        <Icono nombre="borrar" />Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaReglas
