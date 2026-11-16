import { useEffect, useState } from 'react'
import { bajarFoto } from '../api/comentarios'

// Las fotos son privadas: el backend pide la sesión (header Authorization) y un <img src="/api/..."> no la manda.
// Por eso cada foto se baja con fetch y se muestra desde un "blob:" (una dirección que existe solo en este navegador).
// Las fotos nunca cambian: se guardan en memoria para no bajar dos veces la misma (ej: la miniatura y el visor).
const yaBajadas = new Map() // fotoId → promesa del Blob

function bajarUnaVez(fotoId) {
  if (!yaBajadas.has(fotoId)) {
    const promesa = bajarFoto(fotoId)
    promesa.catch(() => yaBajadas.delete(fotoId)) // si falló, la próxima vez se reintenta
    yaBajadas.set(fotoId, promesa)
  }
  return yaBajadas.get(fotoId)
}

// Props: fotoId, descripcion (texto alternativo), className
function FotoProtegida({ fotoId, descripcion, className = '' }) {
  const [direccion, setDireccion] = useState(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let vigente = true
    let creada = null
    bajarUnaVez(fotoId)
      .then((blob) => {
        if (!vigente) return
        creada = URL.createObjectURL(blob)
        setDireccion(creada)
      })
      .catch(() => { if (vigente) setFallo(true) })
    return () => {
      vigente = false
      if (creada) URL.revokeObjectURL(creada) // libera la memoria al salir de la pantalla
    }
  }, [fotoId])

  if (fallo) return <span className={`foto-protegida foto-sin-cargar ${className}`} role="img" aria-label={`${descripcion}: no se pudo cargar`}>No se pudo cargar</span>
  if (!direccion) return <span className={`foto-protegida foto-cargando ${className}`} role="img" aria-label={`${descripcion}: cargando`} />
  return <img className={`foto-protegida ${className}`} src={direccion} alt={descripcion} />
}

export default FotoProtegida
