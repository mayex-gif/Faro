import { useState } from 'react'
import Icono from './Icono'
import { ACCIONES, diferenciasCampos, etiqueta, formatearFecha, formatearValorCampo } from '../utils/auditoria'

// Listado de registros de auditoría. Cada fila se puede desplegar para ver, campo por campo,
// qué tenía el registro antes y qué quedó después (en una modificación se resaltan los campos que cambiaron).
function TablaAuditoria({ registros, mensajeVacio }) {
  const [abierto, setAbierto] = useState(null)

  if (registros.length === 0) {
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="auditoria" /></span>
        <h3>{mensajeVacio}</h3>
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla-auditoria">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-listado-auditoria"
        aria-describedby="ayuda-tabla-auditoria" tabIndex={0}>
        <table className="tabla tabla-auditoria">
          <caption className="solo-lectores">Registros de auditoría, del más reciente al más antiguo</caption>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Acción</th>
              <th scope="col">Registro</th>
              <th scope="col">Actor</th>
              <th scope="col">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((registro) => {
              const desplegado = abierto === registro.id
              return (
                <FilaAuditoria key={registro.id} registro={registro} desplegado={desplegado}
                  onAlternar={() => setAbierto(desplegado ? null : registro.id)} />
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function FilaAuditoria({ registro, desplegado, onAlternar }) {
  const diferencias = diferenciasCampos(registro.valoresAnteriores, registro.valoresNuevos)
  const idDetalle = `detalle-auditoria-${registro.id}`
  return (
    <>
      <tr>
        <td className="fecha-tabla">{formatearFecha(registro.fecha)}</td>
        <td><span className={claseAccion(registro.accion)}><span className="estado-punto" aria-hidden="true" />{etiqueta(ACCIONES, registro.accion)}</span></td>
        <th scope="row">
          <span className="nombre-registro-auditoria">{registro.tipoRegistro}</span>
          <span className="id-registro-auditoria">#{registro.registroId}</span>
        </th>
        <td className="actor-auditoria">{registro.actor || '—'}</td>
        <td>
          <button type="button" className="boton boton-tabla" onClick={onAlternar}
            aria-expanded={desplegado} aria-controls={idDetalle}>
            <Icono nombre={desplegado ? 'abajo' : 'abajo'} />{desplegado ? 'Ocultar cambios' : 'Ver cambios'}
          </button>
        </td>
      </tr>
      {desplegado && (
        <tr className="fila-detalle-auditoria">
          <td colSpan={5} id={idDetalle}>
            {diferencias.length === 0 ? (
              <p className="ayuda-campo">Este registro no guardó datos de los campos.</p>
            ) : (
              <table className="tabla tabla-diferencias-auditoria">
                <caption className="solo-lectores">Valores antes y después del cambio, campo por campo</caption>
                <thead>
                  <tr>
                    <th scope="col">Campo</th>
                    <th scope="col">Antes</th>
                    <th scope="col">Después</th>
                  </tr>
                </thead>
                <tbody>
                  {diferencias.map((dif) => (
                    <tr key={dif.campo} className={dif.cambio ? 'fila-campo-cambiado' : ''}>
                      <th scope="row">{dif.campo}</th>
                      <td>{formatearValorCampo(dif.antes)}</td>
                      <td>{formatearValorCampo(dif.despues)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function claseAccion(accion) {
  if (accion === 'CREACION') return 'estado estado-ok'
  if (accion === 'ELIMINACION') return 'estado estado-falla'
  return 'estado estado-modificacion'
}

export default TablaAuditoria
