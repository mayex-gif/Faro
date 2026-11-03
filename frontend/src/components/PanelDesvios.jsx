import Icono from './Icono'
import { CLASIFICACIONES_DESVIO, claseClasificacion, etiqueta } from '../utils/mantenimiento'

// Resumen de cumplimiento de una regla (o del consolidado municipal, si no se pasa "regla"): cuántas OT se
// generaron, cuántas terminaron a tiempo/adelantadas/demoradas, cuántas siguen pendientes y el % de cumplimiento.
// Lo arma CalculoDesvioService en el backend comparando fecha planificada vs. fecha de ejecución real.
function PanelDesvios({ resumen, cargando, error, onCerrar, onReintentar, titulo }) {
  return (
    <section className="panel panel-desvios" aria-labelledby="titulo-panel-desvios" aria-busy={cargando}>
      <div className="panel-encabezado">
        <div className="titulo-con-icono">
          <span className="icono-panel"><Icono nombre="historial" /></span>
          <div>
            <h2 id="titulo-panel-desvios">{titulo}</h2>
            <p>Comparación entre la fecha planificada y la fecha en que efectivamente se cerró cada orden.</p>
          </div>
        </div>
        {onCerrar && (
          <button type="button" className="boton boton-secundario" onClick={onCerrar}>
            <Icono nombre="cerrar" />Cerrar
          </button>
        )}
      </div>

      {cargando && (
        <div className="estado-listado" role="status">
          <span className="indicador-carga" aria-hidden="true" />
          <p>Calculando desvíos…</p>
        </div>
      )}

      {!cargando && error && (
        <div className="mensaje mensaje-error" role="alert">
          <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
          {onReintentar && <button type="button" className="boton boton-secundario" onClick={onReintentar}>Volver a cargar</button>}
        </div>
      )}

      {!cargando && !error && resumen && (
        resumen.totalGeneradas === 0 ? (
          <div className="estado-listado estado-vacio">
            <h3>Todavía no se generó ninguna orden de trabajo.</h3>
          </div>
        ) : (
          <>
            <ul className="resumen-desvios">
              <li><strong>{resumen.totalGeneradas}</strong>OT generadas</li>
              <li><strong>{resumen.porcentajeCumplimiento.toFixed(0)}%</strong>cumplimiento</li>
              <li><strong>{resumen.desvioPromedioDias.toFixed(1)}</strong>días de desvío promedio</li>
              <li><strong>{resumen.pendientesVencidas}</strong>pendientes vencidas</li>
            </ul>

            <div className="chips-desvios" role="list" aria-label="Detalle por clasificación">
              <Chip etiqueta="Finalizadas a tiempo" valor={resumen.finalizadasATiempo} clase="estado-ok" />
              <Chip etiqueta="Finalizadas adelantadas" valor={resumen.finalizadasAdelantadas} clase="estado-ok" />
              <Chip etiqueta="Finalizadas demoradas" valor={resumen.finalizadasDemoradas} clase="estado-falla" />
              <Chip etiqueta="Pendientes en plazo" valor={resumen.pendientesEnPlazo} clase="estado-modificacion" />
              <Chip etiqueta="Pendientes vencidas" valor={resumen.pendientesVencidas} clase="estado-falla" />
              <Chip etiqueta="Canceladas" valor={resumen.canceladas} clase="estado-baja" />
            </div>

            {resumen.ordenes?.length > 0 && (
              <div className="tabla-contenedor" tabIndex={0}>
                <table className="tabla tabla-desvios">
                  <caption className="solo-lectores">OT generadas por mantenimiento periódico, planificado vs. ejecutado</caption>
                  <thead>
                    <tr>
                      <th scope="col">OT</th>
                      <th scope="col">Lugar</th>
                      <th scope="col">Cuadrilla</th>
                      <th scope="col">Planificada</th>
                      <th scope="col">Ejecutada</th>
                      <th scope="col">Desvío</th>
                      <th scope="col">Clasificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.ordenes.map((orden) => (
                      <tr key={orden.ordenId}>
                        <th scope="row">#{orden.ordenId}<span className="id-registro-auditoria">{orden.estadoNombre}</span></th>
                        <td className="datos-tabla">{orden.lugarNombre ?? '—'}</td>
                        <td className="datos-tabla">{orden.cuadrillaNombre ?? '—'}</td>
                        <td className="fecha-tabla">{orden.fechaPlanificada ?? '—'}</td>
                        <td className="fecha-tabla">{orden.fechaEjecucion ?? '—'}</td>
                        <td className="fecha-tabla">{formatearDesvio(orden.diasDesvio)}</td>
                        <td>
                          <span className={`estado ${claseClasificacion(orden.clasificacionDesvio)}`}>
                            <span className="estado-punto" aria-hidden="true" />
                            {etiqueta(CLASIFICACIONES_DESVIO, orden.clasificacionDesvio)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </section>
  )
}

function Chip({ etiqueta, valor, clase }) {
  return (
    <span className={`chip-desvio estado ${clase}`} role="listitem">
      <strong>{valor}</strong>{etiqueta}
    </span>
  )
}

function formatearDesvio(dias) {
  if (dias === null || dias === undefined) return '—'
  if (dias === 0) return 'A tiempo'
  return dias > 0 ? `+${dias} d` : `${dias} d`
}

export default PanelDesvios
