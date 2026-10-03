function FiltrosPuntos({ filtros, onCambiar, onLimpiar }) {
  function cambiar(evento) {
    const { name, value } = evento.target
    onCambiar({ ...filtros, [name]: value })
  }

  const hayFiltros = filtros.texto !== '' || filtros.tipo !== '' || filtros.estado !== ''

  return (
    <section className="bloque-filtros" aria-labelledby="titulo-filtros-puntos">
      <div className="filtros-encabezado">
        <div>
          <h3 id="titulo-filtros-puntos">Buscar y filtrar lugares</h3>
          <p>Encontrá lugares para consultar su estado o editar sus datos.</p>
        </div>
        {hayFiltros && (
          <button type="button" className="boton boton-secundario" onClick={onLimpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="filtros filtros-puntos">
        <div className="campo filtro-busqueda">
          <label htmlFor="filtro-punto-texto">Buscar un lugar</label>
          <input id="filtro-punto-texto" name="texto" type="search"
            value={filtros.texto} onChange={cambiar}
            placeholder="Nombre o datos técnicos" />
        </div>
        <div className="campo">
          <label htmlFor="filtro-punto-tipo">Tipo de lugar</label>
          <select id="filtro-punto-tipo" name="tipo" value={filtros.tipo} onChange={cambiar}>
            <option value="">Todos los tipos</option>
            <option value="LUMINARIA">Luminaria</option>
            <option value="ESPACIO_VERDE">Espacio verde</option>
            <option value="CALLE">Calle</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-punto-estado">Estado operativo</label>
          <select id="filtro-punto-estado" name="estado" value={filtros.estado} onChange={cambiar}>
            <option value="">Todos los estados</option>
            <option value="funciona">Funciona</option>
            <option value="falla">Fuera de servicio</option>
          </select>
        </div>
      </div>
    </section>
  )
}

export default FiltrosPuntos
