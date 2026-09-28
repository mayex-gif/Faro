import { useEffect, useState } from 'react'
import { listarPuntos } from './api/infraestructura'
import TablaPuntos from './components/TablaPuntos'
import './App.css'
import FormularioPunto from './components/FormularioPunto'

function App() {
  const [puntos, setPuntos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Pide la lista al backend. La dejamos en una función aparte
  // porque después la vamos a volver a usar (al crear, editar o borrar).
  function cargarPuntos() {
    setCargando(true)
    listarPuntos()
      .then((datos) => {
        setPuntos(datos)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargarPuntos()
  }, [])

  return (
    <main className="pagina">
      <h1>Puntos de Infraestructura</h1>
      <FormularioPunto onGuardado={cargarPuntos} />
      {error && <p className="error">❌ No se pudo cargar la lista: {error}</p>}
      {cargando ? <p>Cargando...</p> : <TablaPuntos puntos={puntos} />}
    </main>
  )
}

export default App