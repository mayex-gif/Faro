import { useEffect, useState } from 'react'
import { crearUsuario, modificarUsuario } from '../api/usuarios'
import Icono from './Icono'
import {
  CLAVE_MINIMA, FORMULARIO_VACIO, ROLES, esCapataz, formularioDesde, nombreCompleto, pedidoDesde, validarFormulario,
} from '../utils/usuarios'

// Alta y edición de una persona del personal. En el alta se escribe la clave inicial; al editar, la clave no se toca
// (se restablece aparte, desde la tabla). Las reglas están en utils/usuarios.js y el backend las vuelve a validar.
function FormularioUsuario({ usuarioEditando, cuadrillas, esMiCuenta, onGuardado, onCancelar }) {
  const editando = usuarioEditando != null
  const [datos, setDatos] = useState(() => (editando ? formularioDesde(usuarioEditando) : FORMULARIO_VACIO))
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mostrarClave, setMostrarClave] = useState(false)

  useEffect(() => {
    if (editando) document.getElementById('usuario-nombre').focus({ preventScroll: true })
  }, [editando])

  function cambiar(evento) {
    const { name, value } = evento.target
    setDatos({ ...datos, [name]: value })
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  async function enviar(evento) {
    evento.preventDefault()
    const problemas = validarFormulario(datos, { esAlta: !editando })
    setErrores(problemas)
    if (Object.keys(problemas).length > 0) {
      setError('Revisá los campos marcados.')
      return
    }

    setGuardando(true)
    setError(null)
    try {
      const pedido = pedidoDesde(datos, { esAlta: !editando })
      const guardado = editando ? await modificarUsuario(usuarioEditando.id, pedido) : await crearUsuario(pedido)
      if (!editando) setDatos(FORMULARIO_VACIO)
      onGuardado(editando
        ? `Se guardaron los cambios de ${nombreCompleto(guardado)}.`
        : `Se dio de alta a ${nombreCompleto(guardado)}. Pasale su email y la clave inicial para que entre.`)
    } catch (e) {
      console.error(e)
      // 400: el backend dice qué campo está mal. 404 / 409: explica el motivo (ej.: el email ya existe).
      if (e.estado === 400) setErrores(e.errores ?? {})
      setError([400, 404, 409].includes(e.estado) ? e.message
        : 'No pudimos guardar. Revisá la conexión e intentá nuevamente. Tus datos siguen en el formulario.')
    } finally {
      setGuardando(false)
    }
  }

  // Props comunes de cada campo: marca el error y lo enlaza para los lectores de pantalla.
  function marcaError(campo) {
    return errores[campo] ? { 'aria-invalid': true, 'aria-describedby': `error-usuario-${campo}` } : {}
  }

  return (
    <form id="formulario-usuario" className={editando ? 'panel formulario formulario-editando' : 'panel formulario'}
      onSubmit={enviar} aria-labelledby="titulo-formulario-usuario" aria-busy={guardando} noValidate>
      <div className="panel-encabezado">
        <div className="titulo-con-icono">
          <span className="icono-panel"><Icono nombre={editando ? 'editar' : 'agregar'} /></span>
          <div>
            <h2 id="titulo-formulario-usuario">{editando ? 'Editar persona' : 'Dar de alta a una persona'}</h2>
            <p>{editando ? `Estás modificando: ${nombreCompleto(usuarioEditando)}` : 'Creá la cuenta con la que va a entrar a FARO.'}</p>
          </div>
        </div>
        {editando && <span className="etiqueta-edicion">En edición</span>}
      </div>

      <fieldset className="formulario-cuerpo" disabled={guardando}>
        <legend className="solo-lectores">Datos de la persona</legend>
        <div className="campos campos-usuario">
          <div className="campo">
            <label htmlFor="usuario-nombre">Nombre <span aria-hidden="true">*</span></label>
            <input id="usuario-nombre" name="nombre" value={datos.nombre} onChange={cambiar} required maxLength={100}
              autoComplete="off" {...marcaError('nombre')} />
            <ErrorCampo campo="nombre" mensaje={errores.nombre} />
          </div>
          <div className="campo">
            <label htmlFor="usuario-apellido">Apellido <span aria-hidden="true">*</span></label>
            <input id="usuario-apellido" name="apellido" value={datos.apellido} onChange={cambiar} required maxLength={100}
              autoComplete="off" {...marcaError('apellido')} />
            <ErrorCampo campo="apellido" mensaje={errores.apellido} />
          </div>
          <div className="campo">
            <label htmlFor="usuario-email">Email <span aria-hidden="true">*</span></label>
            <input id="usuario-email" name="email" type="email" value={datos.email} onChange={cambiar} required maxLength={150}
              autoComplete="off" placeholder="Ej.: nombre.apellido@generalpaz.gob.ar" {...marcaError('email')} />
            <ErrorCampo campo="email" mensaje={errores.email} />
            {!errores.email && <p className="ayuda-campo">Es el usuario con el que entra a FARO.</p>}
          </div>
          <div className="campo">
            <label htmlFor="usuario-rol">Rol <span aria-hidden="true">*</span></label>
            <select id="usuario-rol" name="rol" value={datos.rol} onChange={cambiar} required {...marcaError('rol')}>
              <option value="">Elegí un rol</option>
              {ROLES.map((rol) => <option key={rol.valor} value={rol.valor}>{rol.nombre}</option>)}
            </select>
            <ErrorCampo campo="rol" mensaje={errores.rol} />
          </div>
          {esCapataz(datos.rol) && (
            <div className="campo">
              <label htmlFor="usuario-cuadrilla">Cuadrilla a cargo <span aria-hidden="true">*</span></label>
              <select id="usuario-cuadrilla" name="cuadrillaId" value={datos.cuadrillaId} onChange={cambiar} required
                {...marcaError('cuadrillaId')}>
                <option value="">Elegí la cuadrilla</option>
                {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <ErrorCampo campo="cuadrillaId" mensaje={errores.cuadrillaId} />
              {!errores.cuadrillaId && <p className="ayuda-campo">El capataz ve y actualiza las tareas de esta cuadrilla.</p>}
            </div>
          )}
          {!editando && (
            <div className="campo">
              <label htmlFor="usuario-clave">Clave inicial <span aria-hidden="true">*</span></label>
              <input id="usuario-clave" name="clave" type={mostrarClave ? 'text' : 'password'} value={datos.clave}
                onChange={cambiar} required minLength={CLAVE_MINIMA} maxLength={72} autoComplete="new-password"
                {...marcaError('clave')} />
              <ErrorCampo campo="clave" mensaje={errores.clave} />
              <label className="mostrar-clave" htmlFor="usuario-mostrar-clave">
                <input id="usuario-mostrar-clave" type="checkbox" checked={mostrarClave} onChange={(e) => setMostrarClave(e.target.checked)} />
                Mostrar la clave
              </label>
              <p className="ayuda-campo">Mínimo {CLAVE_MINIMA} caracteres. Pasásela a la persona en mano: FARO no la vuelve a mostrar.</p>
            </div>
          )}
        </div>
        {editando && esMiCuenta && (
          <p className="mensaje mensaje-informacion">
            Es tu cuenta: si cambiás tu email, vas a tener que volver a iniciar sesión; si cambiás tu rol, se aplica la próxima vez que entres.
          </p>
        )}
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      </fieldset>

      <div className="formulario-pie">
        <p className="ayuda-campo"><span aria-hidden="true">*</span> Campos obligatorios</p>
        <div className="botones">
          {editando && (
            <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>
              Cancelar edición
            </button>
          )}
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="guardar" />
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Dar de alta'}
          </button>
        </div>
      </div>
    </form>
  )
}

// Mensaje de error debajo de un campo (su id lo enlaza con aria-describedby).
function ErrorCampo({ campo, mensaje }) {
  return mensaje ? <p className="error-campo" id={`error-usuario-${campo}`}>{mensaje}</p> : null
}

export default FormularioUsuario
