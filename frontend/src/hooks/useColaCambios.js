import { useEffect, useState } from 'react'
import { EVENTO_COLA, leerCola } from '../offline/cola'
import { resumenCola } from '../offline/datosCola'

// El cuaderno de la persona que entró, siempre al día: se vuelve a leer cada vez que cambia
// (se anotó algo, se mandó algo, algo quedó en conflicto). Lo usan los carteles y el contador de arriba.
// Devuelve { cola, pendientes, conflictos }.
export function useColaCambios(usuario) {
  const [cola, setCola] = useState([])
  const usuarioId = usuario?.id

  useEffect(() => {
    let vigente = true
    function leer() {
      leerCola(usuarioId)
        .then((leida) => { if (vigente) setCola(leida) })
        .catch(() => { if (vigente) setCola([]) }) // sin almacenamiento no hay cuaderno: se trabaja solo con señal
    }
    leer()
    window.addEventListener(EVENTO_COLA, leer)
    return () => {
      vigente = false
      window.removeEventListener(EVENTO_COLA, leer)
    }
  }, [usuarioId])

  return { cola, ...resumenCola(cola) }
}
