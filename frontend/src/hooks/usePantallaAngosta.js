import { useEffect, useState } from 'react'

// Hasta este ancho la pantalla Mapa usa el diseño de celular: mapa entero, tarjeta desde abajo y "Ver como lista".
// Tiene que coincidir con el @media de estilos-mapa-primero.css.
const CONSULTA = '(max-width: 1050px)'

// Devuelve true mientras la pantalla es angosta (celular o tablet) y se actualiza si cambia (girar el celular,
// achicar la ventana).
function usePantallaAngosta() {
  const [angosta, setAngosta] = useState(() => window.matchMedia(CONSULTA).matches)

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA)
    const alCambiar = () => setAngosta(consulta.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  return angosta
}

export default usePantallaAngosta
