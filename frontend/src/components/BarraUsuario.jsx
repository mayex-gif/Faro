import { useSesion } from '../context/useSesion'
import { NOMBRES_ROL } from '../utils/permisos'

function BarraUsuario() {
  const { usuario, logout } = useSesion()
  return (
    <div className="barra-usuario">
      <div className="usuario-datos">
        <span className="usuario-nombre">{usuario.nombre} {usuario.apellido}</span>
        <span className="usuario-rol">{NOMBRES_ROL[usuario.rol]}</span>
      </div>
      <button type="button" className="nav-enlace usuario-salir" onClick={logout}>Cerrar sesión</button>
    </div>
  )
}

export default BarraUsuario
