// Barra de filtros de la tabla. No filtra nada por sí misma:
// muestra los campos y le avisa a App cuando cambian.
function FiltrosPuntos({ filtros, onCambiar, onLimpiar }) {
  function cambiar(evento) {
    const { name, value } = evento.target
    onCambiar({ ...filtros, [name]: value })
  }

  const hayFiltros = filtros.texto !== '' || filtros.tipo !== '' || filtros.estado !== ''

  return (
    // Reutilizamos el estilo del panel-encabezado pero ajustado para que fluya en columna
    <div className="panel-encabezado" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px', borderBottom: 'none', paddingBottom: '0' }}>
      
      <div>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', marginBottom: '4px' }}>Buscar y filtrar</h3>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--texto-secundario)' }}>
          Encontrá lugares específicos para consultar su estado o editar sus datos.
        </p>
      </div>

      <div className="filtros">
        <input
          name="texto"
          type="search"
          value={filtros.texto}
          onChange={cambiar}
          placeholder="🔍 Buscar por nombre o datos técnicos..."
        />

        <select name="tipo" value={filtros.tipo} onChange={cambiar}>
          <option value="">Todos los tipos</option>
          <option value="LUMINARIA">Luminaria</option>
          <option value="ESPACIO_VERDE">Espacio verde</option>
          <option value="CALLE">Calle</option>
        </select>

        <select name="estado" value={filtros.estado} onChange={cambiar}>
          <option value="">Todos los estados</option>
          <option value="funciona">Funciona</option>
          <option value="falla">Fuera de servicio</option>
        </select>

        {hayFiltros && (
          // Acá estaba el error: le faltaba la clase principal "boton" para tener el padding y márgenes base
          <button type="button" className="boton boton-secundario" onClick={onLimpiar}>
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}

export default FiltrosPuntos