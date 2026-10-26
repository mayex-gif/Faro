import { useEffect, useRef, useState } from 'react'
import { EVENTO_COLA, leerCola } from '../offline/cola'
import { cuantosSeEnviaron, resumenCola } from '../offline/datosCola'

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

// Llama a alEnviar(cantidad) cada vez que renglones del cuaderno llegan bien al servidor.
// "cantidad" suma los que van llegando uno tras otro (para un solo aviso: "se enviaron 3 cambios");
// vuelve a 0 cuando se anota uno nuevo. Los que quedan "para revisar" no cuentan (los muestra el cartel).
export function useCuandoSeEnvian({ pendientes, conflictos }, alEnviar) {
  const antes = useRef({ pendientes, conflictos })
  const seguidos = useRef(0)
  const aviso = useRef(alEnviar)
  useEffect(() => { aviso.current = alEnviar })

  useEffect(() => {
    if (pendientes > antes.current.pendientes) seguidos.current = 0
    if (pendientes < antes.current.pendientes) {
      seguidos.current += cuantosSeEnviaron(antes.current, { pendientes, conflictos })
      aviso.current(seguidos.current)
    }
    antes.current = { pendientes, conflictos }
  }, [pendientes, conflictos])
}
