// Valores iniciales: sin ningún filtro puesto
export const FILTROS_VACIOS = { texto: '', tipo: '', estado: '' }

// Pasa a minúsculas y saca las tildes, así "plaza" encuentra "Plaza"
// y "martin" encuentra "Martín"
function normalizar(texto) {
  return (texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Devuelve solo los puntos que cumplen TODOS los filtros activos
export function filtrarPuntos(puntos, filtros) {
  const busqueda = normalizar(filtros.texto.trim())

  return puntos.filter((punto) => {
    // 1. Buscador: el texto tiene que aparecer en el nombre o en los datos técnicos
    if (busqueda !== '') {
      const textoDelPunto = normalizar(`${punto.nombre} ${punto.datosTecnicos}`)
      if (!textoDelPunto.includes(busqueda)) return false
    }
    // 2. Tipo
    if (filtros.tipo !== '' && punto.tipo !== filtros.tipo) return false
    // 3. Estado ("falla" = fuera de servicio pero instalada; "falta" = luminaria que todavía no se puso)
    if (filtros.estado === 'funciona' && !punto.estadoOperativo) return false
    if (filtros.estado === 'falla' && (punto.estadoOperativo || punto.instalada === false)) return false
    if (filtros.estado === 'falta' && punto.instalada !== false) return false

    return true // pasó todos los filtros
  })
}