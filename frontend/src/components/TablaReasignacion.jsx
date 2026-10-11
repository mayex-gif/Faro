import { useState } from 'react'
import Icono from './Icono'
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta } from '../utils/ordenesTrabajo'
import { cuadrillasParaReasignar } from '../utils/asignacion'

// Una fila: guarda la cuadrilla nueva elegida hasta que se toca "Reasignar".
// Si la reasignación falla, la elección se conserva para volver a intentar.
function FilaReasignacion({ orden, cuadrillas, errorCuadrillas, cargandoCuadrillas, reasignando, deshabilitada, onReasignar }) {
  const [elegida, setElegida] = useState('')
  const opciones = cuadrillasParaReasignar(orden, cuadrillas) // las que hacen ese trabajo, sin la actual
  const hayDisponible = opciones.some((cuadrilla) => cuadrilla.disponible)
  const tipo = etiqueta(TIPOS_TRABAJO, orden.tipo)

  // Solo vale la elección si esa cuadrilla sigue en la lista y disponible
  // (después de reasignar, la elegida pasa a ser la actual y deja de ofrecerse)
  const cuadrillaElegida = opciones.find((cuadrilla) => String(cuadrilla.id) === elegida && cuadrilla.disponible)

  let ayuda
  if (errorCuadrillas) ayuda = 'No se pudieron cargar las cuadrillas.'
  else if (cargandoCuadrillas) ayuda = 'Cargando cuadrillas…'
  else if (opciones.length === 0) ayuda = `Ninguna otra cuadrilla realiza ${tipo.toLowerCase()}.`
  else if (!hayDisponible) ayuda = `Las otras cuadrillas de ${tipo.toLowerCase()} están ocupadas.`
  else ayuda = `Otras cuadrillas que realizan ${tipo.toLowerCase()}.`

  function reasignar() {
    if (cuadrillaElegida) onReasignar(orden, cuadrillaElegida)
  }

  return (
    <tr>
      <th scope="row">
        <span className="nombre-lugar">{orden.descripcion}</span>
        <span className="numero-orden">OT #{orden.id}</span>
      </th>
      <td>{orden.lugarNombre}</td>
      <td><span className="tipo-lugar">{tipo}</span></td>
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
      <td><span className="nombre-lugar">{orden.cuadrillaNombre}</span></td>
      <td className="celda-asignar">
        <div className="campo">
          <label className="solo-lectores" htmlFor={`reasignar-orden-${orden.id}`}>
            Nueva cuadrilla para la orden {orden.id}
          </label>
          <select id={`reasignar-orden-${orden.id}`} value={cuadrillaElegida ? elegida : ''}
            onChange={(evento) => setElegida(evento.target.value)}
            aria-describedby={`ayuda-reasignar-${orden.id}`}
            disabled={reasignando || deshabilitada || errorCuadrillas || cargandoCuadrillas || opciones.length === 0}>
            <option value="">Elegir otra cuadrilla</option>
            {opciones.map((cuadrilla) => (
              <option key={cuadrilla.id} value={cuadrilla.id} disabled={!cuadrilla.disponible}>
                {cuadrilla.nombre} ({cuadrilla.disponible ? 'disponible' : 'ocupada'})
              </option>
            ))}
          </select>
          <p className="ayuda-campo" id={`ayuda-reasignar-${orden.id}`}>{ayuda}</p>
        </div>
        <button type="button" className="boton boton-secundario" onClick={reasignar}
          disabled={!cuadrillaElegida || reasignando || deshabilitada}
          aria-label={`Reasignar la orden ${orden.id} a la cuadrilla elegida`}>
          <Icono nombre="cuadrilla" />{reasignando ? 'Reasignando…' : 'Reasignar'}
        </button>
      </td>
    </tr>
  )
}

// Props:
// - ordenes: las OT asignadas y no cerradas (ya ordenadas por urgencia)
// - cuadrillas: todas las cuadrillas; errorCuadrillas / cargandoCuadrillas: si no se pudieron cargar o todavía se están cargando
// - onReasignar(orden, cuadrilla): se llama al tocar "Reasignar"
// - idReasignando: id de la OT que se está reasignando (mientras tanto se bloquea toda la tabla)
function TablaReasignacion({ ordenes, cuadrillas, errorCuadrillas, cargandoCuadrillas, onReasignar, idReasignando }) {
  if (ordenes.length === 0) {
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="cuadrilla" /></span>
        <h3>No hay órdenes asignadas en curso</h3>
        <p>Cuando asignes una orden a una cuadrilla, va a aparecer acá por si necesitás pasársela a otra.</p>
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla-reasignacion">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-asignadas"
        aria-describedby="ayuda-tabla-reasignacion" tabIndex={0}>
        <table className="tabla tabla-asignacion tabla-reasignacion">
          <caption className="solo-lectores">Órdenes asignadas que se pueden pasar a otra cuadrilla</caption>
          <thead>
            <tr>
              <th scope="col">Trabajo</th>
              <th scope="col">Lugar</th>
              <th scope="col">Tipo</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Estado</th>
              <th scope="col">Cuadrilla actual</th>
              <th scope="col">Reasignar a</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => (
              <FilaReasignacion key={orden.id} orden={orden} cuadrillas={cuadrillas}
                errorCuadrillas={errorCuadrillas} cargandoCuadrillas={cargandoCuadrillas} onReasignar={onReasignar}
                reasignando={orden.id === idReasignando} deshabilitada={idReasignando != null && orden.id !== idReasignando} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaReasignacion