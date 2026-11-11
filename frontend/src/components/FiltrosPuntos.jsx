import { TIPOS_LUGAR, tiposDeCategoria } from '../utils/lugares'

// tipos: los tipos de lugar de la pantalla (Infraestructura: espacios verdes y calles; Luminarias: solo luminarias).
// Con un solo tipo no se muestra el filtro de tipo. Si hay luminarias, se puede filtrar por "Falta poner".
function FiltrosPuntos({ filtros, onCambiar, onLimpiar, tipos = tiposDeCategoria() }) {
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
        {tipos.length > 1 && (
          <div className="campo">
            <label htmlFor="filtro-punto-tipo">Tipo de lugar</label>
            <select id="filtro-punto-tipo" name="tipo" value={filtros.tipo} onChange={cambiar}>
              <option value="">Todos los tipos</option>
              {tipos.map((tipo) => <option key={tipo} value={tipo}>{TIPOS_LUGAR[tipo]}</option>)}
            </select>
          </div>
        )}
        <div className="campo">
          <label htmlFor="filtro-punto-estado">Estado operativo</label>
          <select id="filtro-punto-estado" name="estado" value={filtros.estado} onChange={cambiar}>
            <option value="">Todos los estados</option>
            <option value="funciona">Funciona</option>
            <option value="falla">Fuera de servicio</option>
            {tipos.includes('LUMINARIA') && <option value="falta">Falta poner</option>}
          </select>
        </div>
      </div>
    </section>
  )
}

export default FiltrosPuntos
