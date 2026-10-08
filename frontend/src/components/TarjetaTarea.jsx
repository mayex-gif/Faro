import Icono from './Icono'
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta } from '../utils/ordenesTrabajo'
import { COLORES_PRIORIDAD } from '../utils/mapa'
import { accionesDeTarea, textoAccion } from '../utils/tareas'

// Una tarea del capataz, pensada para el celular: datos claros y un botón grande con la acción principal.
// Props:
// - orden: la OT
// - estados: los estados del flujo (de ellos sale qué acciones se ofrecen)
// - ocupada: true mientras se guarda un cambio de esta tarea
// - bloqueada: true si hay otra tarea guardándose (se deshabilitan los botones de las demás)
// - onAccion(orden, estadoNuevo): se tocó "Iniciar", "Finalizar" u otra opción
// - onVerFicha(lugarId): abre la ficha histórica del lugar
function TarjetaTarea({ orden, estados, ocupada, bloqueada, onAccion, onVerFicha }) {
  const { principal, otras } = accionesDeTarea(orden, estados)
  const sinPermiso = ocupada || bloqueada

  return (
    // El borde de color repite la prioridad (RNF11); el texto de la prioridad está siempre escrito.
    <li className="tarjeta-tarea" style={{ borderLeftColor: COLORES_PRIORIDAD[orden.prioridad] }}>
      <div>
        <h3 className="tarea-titulo">{orden.descripcion}</h3>
        <p className="tarea-lugar"><Icono nombre="lugar" />{orden.lugarNombre}</p>
        <span className="numero-orden">OT #{orden.id}</span>
      </div>

      <div className="tarea-chips">
        <span className={`estado prioridad-${orden.prioridad.toLowerCase()}`}>
          <span className="estado-punto" aria-hidden="true" />
          Prioridad {etiqueta(PRIORIDADES, orden.prioridad).toLowerCase()}
        </span>
        {orden.estadoNombre && (
          <span className="estado" style={{ color: orden.estadoColor, background: `${orden.estadoColor}1A` }}>
            <span className="estado-punto" aria-hidden="true" />
            {orden.estadoNombre}
          </span>
        )}
        <span className="tipo-lugar">{etiqueta(TIPOS_TRABAJO, orden.tipo)}</span>
      </div>

      {principal ? (
        <button type="button" className="boton boton-primario boton-tarea" disabled={sinPermiso}
          onClick={() => onAccion(orden, principal)}
          aria-label={`${textoAccion(principal, true)}: orden ${orden.id}`}>
          <Icono nombre={principal.cierre ? 'guardar' : 'iniciar'} />
          {ocupada ? 'Guardando…' : textoAccion(principal, true)}
        </button>
      ) : (
        <p className="orden-cerrada">No hay acciones disponibles para esta tarea.</p>
      )}

      {otras.length > 0 && (
        <details className="tarea-otras">
          <summary>Otras opciones</summary>
          <div className="tarea-otras-botones">
            {otras.map((estado) => (
              <button key={estado.id} type="button" className="boton boton-secundario boton-tarea-secundario"
                disabled={sinPermiso} onClick={() => onAccion(orden, estado)}
                aria-label={`${textoAccion(estado, false)}: orden ${orden.id}`}>
                {textoAccion(estado, false)}
              </button>
            ))}
          </div>
        </details>
      )}

      <button type="button" className="boton boton-secundario boton-tarea-secundario"
        onClick={() => onVerFicha(orden.lugarId)}
        aria-label={`Ver la ficha histórica de ${orden.lugarNombre}`}>
        <Icono nombre="historial" />Ficha del lugar
      </button>
    </li>
  )
}

export default TarjetaTarea
