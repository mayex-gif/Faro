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

// Componente: recibe la lista de puntos (por props) y dibuja la tabla
function TablaPuntos({ puntos }) {
  if (puntos.length === 0) {
    return <p className="mensaje-vacio">Todavía no hay puntos cargados.</p>
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
        </tr>
      </thead>
      <tbody>
        {puntos.map((punto) => (
          <tr key={punto.id}>
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
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default TablaPuntos