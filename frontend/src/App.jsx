import { useEffect, useState } from 'react'
import { listarPuntos } from './api/infraestructura'

function App() {
  // "Estados": datos que, cuando cambian, hacen que React vuelva a dibujar la pantalla
  const [puntos, setPuntos] = useState([])
  const [error, setError] = useState(null)

  // useEffect con [] al final = "hacé esto una sola vez, cuando la pantalla aparece"
  useEffect(() => {
    listarPuntos()
      .then(setPuntos)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p>❌ {error}</p>

  return (
    <div>
      <h1>Prueba de conexión</h1>
      <p>El backend devolvió {puntos.length} puntos:</p>
      <ul>
        {puntos.map((p) => (
          <li key={p.id}>{p.nombre} ({p.tipo})</li>
        ))}
      </ul>
    </div>
  )
}

export default App