// Buscador de la barra superior: encuentra lugares (por nombre: plazas, calles, luminarias...) y
// trabajos (por descripción, por número de OT o por el lugar donde están).
// Son funciones puras: reciben las listas que ya trae el backend y no tocan la pantalla.

// "Plaza San Martín" → "plaza san martin": sin mayúsculas ni tildes, para que "martin" encuentre "Martín".
export function normalizar(texto) {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Cada palabra buscada tiene que aparecer en el texto, en cualquier orden: "plaza martin" encuentra
// "Plaza San Martín".
function contieneTodas(texto, palabras) {
  const normal = normalizar(texto)
  return palabras.every((palabra) => normal.includes(palabra))
}

// Busca lugares y trabajos. Devuelve { lugares, trabajos }, cada uno con hasta "maximo" resultados.
// - Con menos de 2 letras no busca (devuelve listas vacías).
// - "12" encuentra la OT número 12 (primero) y lo que tenga "12" en el nombre; "#12" encuentra solo la OT 12.
// - Lugares: los que empiezan con lo buscado van primero; después, por nombre.
// - Trabajos: los que coinciden con su descripción o con el nombre de su lugar; los más nuevos primero.
export function buscar(texto, lugares, ordenes, maximo = 5) {
  const normal = normalizar(texto)
  const consulta = normal.replace(/^#\s*/, '')
  if (consulta.length < 2 && !/^\d+$/.test(consulta)) return { lugares: [], trabajos: [] }
  if (normal.startsWith('#')) {
    const orden = ordenes.find((o) => String(o.id) === consulta)
    return { lugares: [], trabajos: orden ? [orden] : [] }
  }
  const palabras = consulta.split(/\s+/)

  const lugaresEncontrados = lugares
    .filter((lugar) => contieneTodas(lugar.nombre, palabras))
    .sort((a, b) => {
      const empiezaA = normalizar(a.nombre).startsWith(consulta)
      const empiezaB = normalizar(b.nombre).startsWith(consulta)
      if (empiezaA !== empiezaB) return empiezaA ? -1 : 1
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  const numero = /^\d+$/.test(consulta) ? Number(consulta) : null
  const trabajosEncontrados = ordenes
    .filter((orden) => orden.id === numero
      || contieneTodas(`${orden.descripcion} ${orden.lugarNombre ?? ''}`, palabras))
    .sort((a, b) => {
      if ((a.id === numero) !== (b.id === numero)) return a.id === numero ? -1 : 1
      return (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? '') || b.id - a.id
    })

  return { lugares: lugaresEncontrados.slice(0, maximo), trabajos: trabajosEncontrados.slice(0, maximo) }
}
