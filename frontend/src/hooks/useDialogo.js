import { useEffect } from 'react'

const ENFOCABLES = 'button:not([disabled]), input:not([disabled]):not([hidden]), textarea:not([disabled]), select:not([disabled]), [href]'

// Lo que comparten los pop-ups de "Finalizar" y "Cancelar" (ventanas que tapan la página):
// - al abrir, el foco va al título (h2) de la ventana; al cerrar, vuelve al botón que la abrió,
// - Escape cierra (salvo mientras se está mandando: ocupado = true),
// - Tab no se escapa de la ventana: da la vuelta adentro,
// - la página de atrás no se mueve mientras la ventana está abierta.
// ventana = useRef del elemento con role="dialog".
export function useDialogo(ventana, { ocupado = false, onCerrar }) {
  useEffect(() => {
    const anterior = document.activeElement
    ventana.current?.querySelector('h2')?.focus()
    const scrollAntes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = scrollAntes
      anterior?.focus?.()
    }
  }, [ventana])

  useEffect(() => {
    function alApretar(evento) {
      if (evento.key === 'Escape' && !ocupado) onCerrar()
      if (evento.key !== 'Tab' || !ventana.current) return
      const enfocables = [...ventana.current.querySelectorAll(ENFOCABLES)]
      if (enfocables.length === 0) return
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      if (evento.shiftKey && (document.activeElement === primero || !ventana.current.contains(document.activeElement))) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alApretar)
    return () => document.removeEventListener('keydown', alApretar)
  }, [ventana, ocupado, onCerrar])
}
