import Icono from './Icono'
import { useSesion } from '../context/useSesion'
import { useColaCambios } from '../hooks/useColaCambios'
import { NOMBRES_ROL } from '../utils/permisos'

function BarraUsuario() {
  const { usuario, logout } = useSesion()
  // Cambios hechos sin señal que todavía no llegaron (o que hay que revisar): siempre a la vista
  const { pendientes, conflictos } = useColaCambios(usuario)
  const texto = [pendientes > 0 && `${pendientes} sin enviar`, conflictos > 0 && `${conflictos} para revisar`]
    .filter(Boolean).join(' · ')
  return (
    <div className="barra-usuario">
      {texto && <span className={conflictos > 0 ? 'contador-cola contador-cola-revisar' : 'contador-cola'}
        role="status" aria-label={`Cambios guardados en este celular: ${texto}`} title={texto}>
        <Icono nombre={conflictos > 0 ? 'editar' : 'historial'} />
        <span aria-hidden="true">{conflictos > 0 ? conflictos : pendientes}</span>
        <span className="contador-cola-texto" aria-hidden="true">{conflictos > 0 ? 'para revisar' : 'sin enviar'}</span>
      </span>}
      <div className="usuario-datos">
        <span className="usuario-nombre">{usuario.nombre} {usuario.apellido}</span>
        <span className="usuario-rol">{NOMBRES_ROL[usuario.rol]}</span>
      </div>
      <button type="button" className="nav-enlace usuario-salir" onClick={logout}>Cerrar sesión</button>
    </div>
  )
}

export default BarraUsuario
