import { ORIGENES, PRIORIDADES, TIPOS_TRABAJO } from '../utils/ordenesTrabajo'
import { rangoFechasValido } from '../utils/filtrosOrdenes'

// Los controles avisan a la página; la lógica está en utils/filtrosOrdenes.js.
function FiltrosOrdenes({ filtros, lugares, estados = [], onCambiar, onLimpiar }) {
  const hayFiltros = Object.values(filtros).some((valor) => valor !== '')
  const rangoValido = rangoFechasValido(filtros)

  function cambiar(evento) {
    const { name, value } = evento.target
    onCambiar({ ...filtros, [name]: value })
  }

  return (
    <section className="bloque-filtros" aria-labelledby="titulo-filtros-ordenes">
      <div className="filtros-encabezado">
        <div>
          <h3 id="titulo-filtros-ordenes">Buscar y filtrar órdenes</h3>
          <p>Combiná los criterios para encontrar el trabajo que necesitás consultar.</p>
        </div>
        {hayFiltros && (
          <button type="button" className="boton boton-secundario" onClick={onLimpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="filtros filtros-ordenes">
        <div className="campo filtro-busqueda">
          <label htmlFor="filtro-orden-texto">Buscar una orden</label>
          <input id="filtro-orden-texto" name="texto" type="search"
            value={filtros.texto} onChange={cambiar}
            placeholder="Descripción, lugar o número de orden" />
        </div>
        {estados.length > 0 && (
          <div className="campo">
            <label htmlFor="filtro-orden-estado">Estado</label>
            <select id="filtro-orden-estado" name="estadoId" value={filtros.estadoId} onChange={cambiar}>
              <option value="">Todos los estados</option>
              {estados.map((estado) => (
                <option key={estado.id} value={estado.id}>{estado.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <div className="campo">
          <label htmlFor="filtro-orden-prioridad">Prioridad</label>
          <select id="filtro-orden-prioridad" name="prioridad" value={filtros.prioridad} onChange={cambiar}>
            <option value="">Todas las prioridades</option>
            {PRIORIDADES.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-orden-tipo">Tipo de trabajo</label>
          <select id="filtro-orden-tipo" name="tipo" value={filtros.tipo} onChange={cambiar}>
            <option value="">Todos los tipos</option>
            {TIPOS_TRABAJO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-orden-origen">Origen</label>
          <select id="filtro-orden-origen" name="origen" value={filtros.origen} onChange={cambiar}>
            <option value="">Todos los orígenes</option>
            {ORIGENES.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-orden-desde">Creada desde</label>
          <input id="filtro-orden-desde" name="desde" type="date"
            value={filtros.desde} onChange={cambiar}
            aria-invalid={!rangoValido}
            aria-describedby={rangoValido ? 'ayuda-fechas-ordenes' : 'error-fechas-ordenes'} />
        </div>
        <div className="campo">
          <label htmlFor="filtro-orden-hasta">Creada hasta</label>
          <input id="filtro-orden-hasta" name="hasta" type="date"
            value={filtros.hasta} onChange={cambiar}
            aria-invalid={!rangoValido}
            aria-describedby={rangoValido ? 'ayuda-fechas-ordenes' : 'error-fechas-ordenes'} />
        </div>
        <div className="campo">
          <label htmlFor="filtro-orden-lugar">Lugar</label>
          <select id="filtro-orden-lugar" name="lugarId" value={filtros.lugarId} onChange={cambiar}>
            <option value="">Todos los lugares</option>
            {lugares.map((lugar) => (
              <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="ayuda-campo" id="ayuda-fechas-ordenes">
        El rango usa la fecha de creación e incluye ambos días. Podés completar una sola fecha.
      </p>
      {!rangoValido && (
        <p className="error-campo" id="error-fechas-ordenes" role="alert">
          La fecha “hasta” debe ser igual o posterior a la fecha “desde”.
        </p>
      )}
    </section>
  )
}

export default FiltrosOrdenes
