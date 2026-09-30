// Barra de filtros de la tabla. No filtra nada por sí misma:
// muestra los campos y le avisa a App cuando cambian.
function FiltrosPuntos({ filtros, onCambiar, onLimpiar }) {
  function cambiar(evento) {
    const { name, value } = evento.target
    onCambiar({ ...filtros, [name]: value })
  }

  const hayFiltros = filtros.texto !== '' || filtros.tipo !== '' || filtros.estado !== ''

  return (
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
        <button type="button" className="boton-tabla" onClick={onLimpiar}>
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

export default FiltrosPuntos