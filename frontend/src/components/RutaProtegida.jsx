import { useEffect } from 'react'
import { useSesion } from '../context/useSesion'
import PaginaLogin from '../pages/PaginaLogin'

// La aplicación ya tiene navegación propia; no hace falta agregar otro enrutador.
function RutaProtegida({ children }) {
  const { usuario, cargando, error, reintentar, logout } = useSesion()
  useEffect(() => {
    if (cargando || error) document.title = 'Verificar sesión | FARO'
  }, [cargando, error])

  if (cargando || error) return (
    <main className="estado-sesion">
      <section className="panel acceso-panel" aria-busy={cargando}>
        <img src="/logo-faro.png" alt="FARO" width="64" height="64" />
        <h1>Verificar sesión</h1>
        {cargando ? <p role="status">Comprobando tu acceso…</p> : <>
          <p className="mensaje mensaje-error" role="alert">{error}</p>
          <button className="boton boton-primario" onClick={reintentar}>Volver a intentar</button>
          <button className="boton boton-secundario" onClick={logout}>Volver al ingreso</button>
        </>}
      </section>
    </main>
  )
  if (!usuario) return <PaginaLogin />
  return children
}

export default RutaProtegida
