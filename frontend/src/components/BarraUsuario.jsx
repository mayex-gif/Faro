// Info del operador logueado y botón para cerrar sesión (FRONTEND_AUTENTICACION_Y_ROLES.md, 3.6).
import { useAuth } from '../context/AuthContext'
import { nombreRol } from '../utils/auth'
import Icono from './Icono'

function iniciales(usuario) {
  return `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
}

function BarraUsuario() {
  const { usuario, logout } = useAuth()
  if (!usuario) return null

  function cerrarSesion() {
    if (window.confirm('¿Cerrar la sesión?')) logout()
  }

  return (
    <div className="barra-usuario">
      <span className="barra-usuario-avatar" aria-hidden="true">{iniciales(usuario)}</span>
      <span className="barra-usuario-datos">
        <span className="barra-usuario-nombre">{usuario.nombre} {usuario.apellido}</span>
        <span className="barra-usuario-rol">{nombreRol(usuario.rol)}</span>
      </span>
      <button type="button" className="barra-usuario-salir" onClick={cerrarSesion}>
        <Icono nombre="cerrar" />
        <span className="solo-lectores">Cerrar sesión</span>
      </button>
    </div>
  )
}

export default BarraUsuario
