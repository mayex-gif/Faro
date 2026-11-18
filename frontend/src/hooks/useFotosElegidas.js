import { useEffect, useRef, useState } from 'react'
import { nuevoNumero } from '../offline/datosCola'
import { fotosQueQuedan, mensajeDeError } from '../utils/comentarios'
import { achicarFoto } from '../utils/fotos'

// Las fotos que se eligen para un comentario, ANTES de mandarlo: se achican en el celular (utils/fotos.js)
// y se arma una vista previa de cada una. Lo usa el pop-up de "Finalizar" (fotos de evidencia).
// Devuelve { fotos: [{ clave, blob, vista }], preparando, problema, agregar(evento del <input type="file">), quitar(clave) }.
export function useFotosElegidas() {
  const [fotos, setFotos] = useState([])
  const [preparando, setPreparando] = useState(false)
  const [problema, setProblema] = useState('') // ej: "No se pudo abrir esa foto" o "se agregaron 2"
  const vistas = useRef([])

  // Al cerrar, se liberan las vistas previas (si no, quedan ocupando memoria del celular)
  useEffect(() => () => vistas.current.forEach((vista) => URL.revokeObjectURL(vista)), [])

  async function agregar(evento) {
    const elegidas = [...evento.target.files]
    evento.target.value = '' // permite volver a elegir la misma foto
    if (elegidas.length === 0) return
    const lugar = fotosQueQuedan(fotos.length)
    const entran = elegidas.slice(0, lugar)
    setProblema(elegidas.length > lugar ? `Se pueden agregar hasta 5 fotos: se agregaron ${entran.length}.` : '')
    setPreparando(true)
    try {
      const listas = []
      for (const archivo of entran) {
        const blob = await achicarFoto(archivo)
        const vista = URL.createObjectURL(blob)
        vistas.current.push(vista)
        listas.push({ clave: nuevoNumero(), blob, vista })
      }
      setFotos((anteriores) => [...anteriores, ...listas])
    } catch (e) {
      setProblema(mensajeDeError(e))
    } finally {
      setPreparando(false)
    }
  }

  function quitar(clave) {
    setFotos((anteriores) => anteriores.filter((foto) => foto.clave !== clave))
  }

  return { fotos, preparando, problema, agregar, quitar }
}
