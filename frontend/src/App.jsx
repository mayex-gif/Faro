import { useEffect, useState } from 'react'
import { eliminarPunto, listarPuntos } from './api/infraestructura'
import FormularioPunto from './components/FormularioPunto'
import TablaPuntos from './components/TablaPuntos'
import './App.css'

function App() {
  const [puntos, setPuntos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  // El punto que se está editando, o null si el formulario está en modo "nuevo"
  const [puntoEditando, setPuntoEditando] = useState(null)

  // Pide la lista al backend
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

  // Botón "Editar" de la tabla: pasamos el formulario a modo edición y subimos hasta él
  function editar(punto) {
    setPuntoEditando(punto)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Cuando el formulario guardó bien: salimos del modo edición y recargamos la tabla
  function alGuardar() {
    setPuntoEditando(null)
    cargarPuntos()
  }

  // Botón "Borrar" de la tabla
  async function eliminar(punto) {
    const confirmado = window.confirm(`¿Seguro que querés borrar "${punto.nombre}"? No se puede deshacer.`)
    if (!confirmado) return
    try {
      await eliminarPunto(punto.id)
      if (puntoEditando?.id === punto.id) setPuntoEditando(null)
      cargarPuntos()
    } catch (e) {
      setError(`No se pudo borrar: ${e.message}`)
    }
  }

  return (
    <main className="pagina">
      <h1>Puntos de Infraestructura</h1>

      {/* La "key" hace que el formulario se reinicie cada vez que cambia el punto a editar */}
      <FormularioPunto
        key={puntoEditando?.id ?? 'nuevo'}
        puntoEditando={puntoEditando}
        onGuardado={alGuardar}
        onCancelar={() => setPuntoEditando(null)}
      />

      {error && <p className="error">❌ {error}</p>}
      {cargando ? (
        <p>Cargando...</p>
      ) : (
        <TablaPuntos
          puntos={puntos}
          idEditando={puntoEditando?.id}
          onEditar={editar}
          onEliminar={eliminar}
        />
      )}
    </main>
  )
}

export default App