// Textos para mostrar de un lugar (Punto de Infraestructura).
// Los valores de "tipo" son los que guarda el backend.

export const TIPOS_LUGAR = {
  ESPACIO_VERDE: 'Espacio verde',
  CALLE: 'Calle',
  LUMINARIA: 'Luminaria',
}

// Categorías de lugares: las luminarias tienen su propia sección (Más → Luminarias) y su pestaña en el mapa.
// Infraestructura queda para espacios verdes y calles. Los tipos van en el orden en que se ofrecen.
export const CATEGORIAS_LUGAR = {
  infraestructura: ['ESPACIO_VERDE', 'CALLE'],
  luminarias: ['LUMINARIA'],
}

// Los tipos de una categoría. Una categoría desconocida (o ninguna) = todos los tipos.
export function tiposDeCategoria(categoria) {
  return CATEGORIAS_LUGAR[categoria] ?? Object.keys(TIPOS_LUGAR)
}

// Solo los lugares de una categoría (ej. la lista de Infraestructura sin las luminarias).
export function lugaresDeCategoria(lugares, categoria) {
  const tipos = tiposDeCategoria(categoria)
  return lugares.filter((lugar) => tipos.includes(lugar.tipo))
}

// Texto del estado de un lugar en las listas: las luminarias que faltan poner (instalada === false) lo dicen.
export function textoEstadoLugar(lugar) {
  if (lugar.instalada === false) return 'Falta poner'
  return textoEstadoOperativo(lugar.estadoOperativo)
}

// Clase CSS del estado: verde (funciona), rojo (fuera de servicio) o gris (falta poner).
export function claseEstadoLugar(lugar) {
  if (lugar.instalada === false) return 'estado estado-pendiente'
  return lugar.estadoOperativo ? 'estado estado-ok' : 'estado estado-falla'
}

// Los dos datos de estado que se mandan al backend al guardar un lugar desde un formulario.
// "Todavía no está instalada" solo existe para luminarias, y una luminaria que no se puso no puede funcionar.
export function estadoParaGuardar({ tipo, estadoOperativo, instalada }) {
  if (tipo !== 'LUMINARIA') return { estadoOperativo, instalada: true }
  return instalada === false ? { estadoOperativo: false, instalada: false } : { estadoOperativo, instalada: true }
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
