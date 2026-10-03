export const FILTROS_ORDENES_VACIOS = {
  texto: '',
  prioridad: '',
  tipo: '',
  origen: '',
  lugarId: '',
  desde: '',
  hasta: '',
}

export function rangoFechasValido(filtros) {
  return !filtros.desde || !filtros.hasta || filtros.desde <= filtros.hasta
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Se aplican todos los criterios a la vez, sobre la lista ya descargada.
// No cambia los registros ni su orden (más recientes primero).
export function filtrarOrdenes(ordenes, filtros) {
  if (!rangoFechasValido(filtros)) return []
  const busqueda = normalizar(filtros.texto.trim())

  return ordenes.filter((orden) => {
    const texto = `${orden.id} ${orden.descripcion ?? ''} ${orden.lugarNombre ?? ''}`
    if (busqueda && !normalizar(texto).includes(busqueda)) return false
    if (filtros.prioridad && orden.prioridad !== filtros.prioridad) return false
    if (filtros.tipo && orden.tipo !== filtros.tipo) return false
    if (filtros.origen && orden.origen !== filtros.origen) return false
    if (filtros.lugarId && String(orden.lugarId) !== filtros.lugarId) return false

    // El backend envía fechaCreacion como fecha/hora local de Argentina.
    // Comparar YYYY-MM-DD incluye todo el día, sin convertir zonas horarias.
    const fecha = (orden.fechaCreacion ?? '').slice(0, 10)
    if ((filtros.desde || filtros.hasta) && !fecha) return false
    if (filtros.desde && fecha < filtros.desde) return false
    if (filtros.hasta && fecha > filtros.hasta) return false
    return true
  })
}
