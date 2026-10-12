// Textos para mostrar de un lugar (Punto de Infraestructura).
// Los valores de "tipo" son los que guarda el backend.

export const TIPOS_LUGAR = {
  ESPACIO_VERDE: 'Espacio verde',
  CALLE: 'Calle',
  LUMINARIA: 'Luminaria',
}

export function etiquetaTipoLugar(tipo) {
  return TIPOS_LUGAR[tipo] ?? tipo
}

// "Funciona" / "Fuera de servicio" (igual que en el listado de Infraestructura)
export function textoEstadoOperativo(estadoOperativo) {
  return estadoOperativo ? 'Funciona' : 'Fuera de servicio'
}

// "-31.0001, -64.2002" para un punto; un texto corto para líneas y polígonos.
export function describirUbicacion(ubicacion) {
  if (!ubicacion) return 'Sin ubicación'
  switch (ubicacion.type) {
    case 'Point': {
      if (!ubicacion.coordinates || ubicacion.coordinates.length < 2) return 'Ubicación inválida'
      const [longitud, latitud] = ubicacion.coordinates // GeoJSON: [longitud, latitud]
      return `${latitud.toFixed(4)}, ${longitud.toFixed(4)}`
    }
    case 'LineString':
      return `Línea de ${ubicacion.coordinates?.length || 0} puntos`
    case 'Polygon':
      return 'Polígono'
    default:
      return ubicacion.type
  }
}
