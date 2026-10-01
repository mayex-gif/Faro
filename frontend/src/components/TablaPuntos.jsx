// Nombres "lindos" para mostrar cada tipo
const NOMBRES_TIPO = {
  ESPACIO_VERDE: 'Espacio verde',
  CALLE: 'Calle',
  LUMINARIA: 'Luminaria',
}

// Convierte la ubicación (GeoJSON) en un texto corto para la tabla
function describirUbicacion(ubicacion) {
  if (!ubicacion) return '—'
  switch (ubicacion.type) {
    case 'Point': {
      // Ojo: GeoJSON guarda [longitud, latitud]
      const [longitud, latitud] = ubicacion.coordinates
      return `Punto (${latitud.toFixed(4)}, ${longitud.toFixed(4)})`
    }
    case 'LineString':
      return `Línea de ${ubicacion.coordinates.length} puntos`
    case 'Polygon':
      return 'Polígono'
    default:
      return ubicacion.type
  }
}

// Props:
// - puntos: la lista a mostrar
// - idEditando: el id del punto que se está editando (para resaltar su fila)
// - onEditar / onEliminar: funciones que App nos pasa para avisarle qué botón se tocó
function TablaPuntos({ puntos, idEditando, onEditar, onEliminar, mensajeVacio = 'Todavía no hay puntos cargados.' }) {
  if (puntos.length === 0) {
    return <p className="mensaje-vacio">{mensajeVacio}</p>
  }

  return (
    <table className="tabla">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Datos técnicos</th>
          <th>Estado</th>
          <th>Ubicación</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {puntos.map((punto) => (
          <tr key={punto.id} className={punto.id === idEditando ? 'fila-editando' : ''}>
            <td>{punto.nombre}</td>
            <td>{NOMBRES_TIPO[punto.tipo] ?? punto.tipo}</td>
            <td>{punto.datosTecnicos || '—'}</td>
            <td>
              {punto.estadoOperativo ? (
                <span className="estado estado-ok">Funciona</span>
              ) : (
                <span className="estado estado-falla">Fuera de servicio</span>
              )}
            </td>
            <td>{describirUbicacion(punto.ubicacion)}</td>
            <td>
              <div className="acciones">
                <button type="button" className="boton-tabla" onClick={() => onEditar(punto)}>
                  Editar
                </button>
                <button type="button" className="boton-tabla boton-borrar" onClick={() => onEliminar(punto)}>
                  Borrar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default TablaPuntos