import Icono from './Icono'
import { motivoParaNoDarDeBaja, nombreCompleto, nombreCuadrilla, nombreRol } from '../utils/usuarios'

// Listado del personal con sus acciones. Si no se puede dar de baja a alguien (es tu cuenta o el único encargado),
// en lugar del botón se muestra el motivo.
function TablaUsuarios({ usuarios, todos, cuadrillas, sesion, idEditando, ocupado, onEditar, onDarDeBaja, onReactivar, onClave, mensajeVacio }) {
  if (usuarios.length === 0) {
    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="usuario" /></span>
        <h3>{mensajeVacio}</h3>
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla-usuarios">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-listado-usuarios"
        aria-describedby="ayuda-tabla-usuarios" tabIndex={0}>
        <table className="tabla tabla-usuarios">
          <caption className="solo-lectores">Personal que usa FARO, con su rol y si puede entrar</caption>
          <thead>
            <tr>
              <th scope="col">Persona</th>
              <th scope="col">Rol</th>
              <th scope="col">Cuadrilla</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => {
              const nombre = nombreCompleto(usuario)
              const motivo = motivoParaNoDarDeBaja(usuario, sesion, todos)
              const clases = [usuario.id === idEditando ? 'fila-editando' : '', usuario.activo ? '' : 'fila-de-baja'].join(' ').trim()
              return (
                <tr key={usuario.id} className={clases}>
                  <th scope="row">
                    <span className="nombre-usuario">
                      {nombre}
                      {usuario.id === sesion?.id && <span className="marca-tu-cuenta">Vos</span>}
                    </span>
                    <span className="email-usuario">{usuario.email}</span>
                    {usuario.id === idEditando && <span className="marca-edicion">En edición</span>}
                  </th>
                  <td><span className="tipo-lugar">{nombreRol(usuario.rol)}</span></td>
                  <td className="cuadrilla-usuario">{nombreCuadrilla(usuario.cuadrillaId, cuadrillas)}</td>
                  <td>
                    <span className={usuario.activo ? 'estado estado-ok' : 'estado estado-baja'}>
                      <span className="estado-punto" aria-hidden="true" />
                      {usuario.activo ? 'Activo' : 'De baja'}
                    </span>
                  </td>
                  <td>
                    <div className="acciones acciones-usuario">
                      <button type="button" className="boton boton-tabla" onClick={() => onEditar(usuario)} disabled={ocupado}
                        aria-label={`Editar a ${nombre}`}>
                        <Icono nombre="editar" />Editar
                      </button>
                      <button type="button" className="boton boton-tabla" onClick={() => onClave(usuario)} disabled={ocupado}
                        aria-label={`Restablecer la clave de ${nombre}`}>
                        <Icono nombre="clave" />Clave
                      </button>
                      {!usuario.activo && (
                        <button type="button" className="boton boton-tabla" onClick={() => onReactivar(usuario)} disabled={ocupado}
                          aria-label={`Reactivar a ${nombre}`}>
                          <Icono nombre="guardar" />Reactivar
                        </button>
                      )}
                      {usuario.activo && !motivo && (
                        <button type="button" className="boton boton-tabla boton-borrar" onClick={() => onDarDeBaja(usuario)} disabled={ocupado}
                          aria-label={`Dar de baja a ${nombre}`}>
                          <Icono nombre="baja" />Dar de baja
                        </button>
                      )}
                      {usuario.activo && motivo && <span className="motivo-sin-baja">{motivo}</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaUsuarios
