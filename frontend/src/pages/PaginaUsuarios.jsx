import { useEffect, useState } from 'react'
import { cambiarActivo, listarUsuarios, restablecerClave } from '../api/usuarios'
import { listarCuadrillas } from '../api/cuadrillas'
import FormularioUsuario from '../components/FormularioUsuario'
import TablaUsuarios from '../components/TablaUsuarios'
import Icono from '../components/Icono'
import { useSesion } from '../context/useSesion'
import { CLAVE_MINIMA, filtrarUsuarios, nombreCompleto, validarClave } from '../utils/usuarios'
import '../estilos-usuarios.css'

const FILTROS_INICIALES = { texto: '', estado: 'activos' }

// Gestión del personal (altas, bajas y cambios). La ven el encargado y la mesa de entradas (utils/permisos.js);
// el backend valida lo mismo (403 para otros roles). No se borra a nadie: la baja deja la cuenta inactiva.
function PaginaUsuarios() {
  const { usuario: sesion } = useSesion()
  const [usuarios, setUsuarios] = useState([])
  const [cuadrillas, setCuadrillas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [editando, setEditando] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  // Acción que espera confirmación: { tipo: 'baja' | 'clave', usuario }
  const [accion, setAccion] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const visibles = filtrarUsuarios(usuarios, filtros)

  function cargar() {
    return Promise.all([listarUsuarios(), listarCuadrillas()])
      .then(([listaUsuarios, listaCuadrillas]) => {
        setUsuarios(listaUsuarios)
        setCuadrillas(listaCuadrillas)
        setError(null)
      })
      .catch((e) => {
        console.error(e)
        setError('No pudimos cargar el personal. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargando(false))
  }

  function recargar() {
    setCargando(true)
    cargar()
  }

  useEffect(() => {
    cargar()
  }, [])

  function irA(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  function editar(usuario) {
    setAccion(null)
    setEditando(usuario)
    setMensaje('')
    irA('formulario-usuario')
  }

  function alGuardar(texto) {
    setEditando(null)
    setMensaje(texto)
    recargar()
  }

  function pedirConfirmacion(tipo, usuario) {
    setMensaje('')
    setAccion({ tipo, usuario })
  }

  // El aviso de confirmación aparece arriba de la tabla: lo mostramos y le damos el foco.
  useEffect(() => {
    if (accion) {
      irA('aviso-usuario')
      document.getElementById(accion.tipo === 'clave' ? 'clave-nueva' : 'aviso-usuario')?.focus({ preventScroll: true })
    }
  }, [accion])

  async function ejecutar(promesa, textoExito) {
    setProcesando(true)
    try {
      await promesa()
      setAccion(null)
      setMensaje(textoExito)
      recargar()
      return null
    } catch (e) {
      console.error(e)
      return [400, 404, 409].includes(e.estado) ? e.message : 'No pudimos completar la operación. Intentá nuevamente.'
    } finally {
      setProcesando(false)
    }
  }

  async function reactivar(usuario) {
    setMensaje('')
    const problema = await ejecutar(() => cambiarActivo(usuario.id, true),
      `Se reactivó a ${nombreCompleto(usuario)}: ya puede volver a entrar con su clave.`)
    if (problema) setError(problema)
  }

  const mensajeVacio = usuarios.length === 0 ? 'Todavía no hay personal cargado.' : 'Nadie coincide con la búsqueda.'

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">PERSONAL</p>
        <h1>Usuarios</h1>
        <p>Dá de alta a quienes usan FARO, cambiá su rol o dales de baja cuando dejan el corralón.</p>
      </div>

      <FormularioUsuario
        key={editando?.id ?? 'nuevo'}
        usuarioEditando={editando}
        cuadrillas={cuadrillas}
        esMiCuenta={editando?.id === sesion?.id}
        onGuardado={alGuardar}
        onCancelar={() => setEditando(null)}
      />

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
      </div>

      {accion && (
        <AvisoAccion key={`${accion.tipo}-${accion.usuario.id}`} accion={accion} procesando={procesando}
          onCancelar={() => setAccion(null)}
          onConfirmar={(claveNueva) => (accion.tipo === 'baja'
            ? ejecutar(() => cambiarActivo(accion.usuario.id, false),
              `Se dio de baja a ${nombreCompleto(accion.usuario)}: ya no puede entrar a FARO. Para verla, elegí "De baja" en el filtro.`)
            : ejecutar(() => restablecerClave(accion.usuario.id, claveNueva),
              `Se cambió la clave de ${nombreCompleto(accion.usuario)}. Pasásela en mano.`))} />
      )}

      <section className="panel listado" aria-labelledby="titulo-listado-usuarios" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado-usuarios">Personal</h2>
            <p>Las personas dadas de baja no pueden entrar, pero siguen en la historia de los trabajos.</p>
          </div>
          {!cargando && !error && <span className="contador">Mostrando {visibles.length} de {usuarios.length}</span>}
        </div>

        <section className="bloque-filtros" aria-label="Buscar y filtrar personal">
          <div className="filtros filtros-usuarios">
            <div className="campo filtro-busqueda">
              <label htmlFor="filtro-usuario-texto">Buscar</label>
              <input id="filtro-usuario-texto" type="search" value={filtros.texto} placeholder="Nombre, apellido o email"
                onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="filtro-usuario-estado">Mostrar</label>
              <select id="filtro-usuario-estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
                <option value="activos">Activos</option>
                <option value="baja">De baja</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargar}>Volver a cargar</button>
          </div>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando personal…</p>
          </div>
        ) : !error && (
          <TablaUsuarios usuarios={visibles} todos={usuarios} cuadrillas={cuadrillas} sesion={sesion}
            idEditando={editando?.id} ocupado={procesando} mensajeVacio={mensajeVacio}
            onEditar={editar} onReactivar={reactivar}
            onDarDeBaja={(u) => pedirConfirmacion('baja', u)} onClave={(u) => pedirConfirmacion('clave', u)} />
        )}
      </section>
    </>
  )
}

// Aviso en pantalla (en vez de window.confirm) para confirmar una baja o escribir la clave nueva.
function AvisoAccion({ accion, procesando, onCancelar, onConfirmar }) {
  const [clave, setClave] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [problema, setProblema] = useState('')
  const nombre = nombreCompleto(accion.usuario)
  const esBaja = accion.tipo === 'baja'

  async function confirmar(evento) {
    evento.preventDefault()
    if (!esBaja) {
      const errorClave = validarClave(clave)
      if (errorClave) {
        setProblema(errorClave)
        return
      }
    }
    setProblema((await onConfirmar(clave)) ?? '')
  }

  return (
    <form id="aviso-usuario" className={esBaja ? 'panel aviso-usuario aviso-baja' : 'panel aviso-usuario'}
      onSubmit={confirmar} tabIndex={-1} aria-labelledby="titulo-aviso-usuario" aria-busy={procesando}>
      <div className="aviso-usuario-cuerpo">
        <h2 id="titulo-aviso-usuario">{esBaja ? `¿Dar de baja a ${nombre}?` : `Restablecer la clave de ${nombre}`}</h2>
        {esBaja ? (
          <p>No va a poder entrar a FARO, aunque tenga la sesión abierta. No se borra nada: sigue en la historia
            de los trabajos y la podés reactivar cuando quieras.</p>
        ) : (
          <div className="campo campo-clave-nueva">
            <label htmlFor="clave-nueva">Clave nueva <span aria-hidden="true">*</span></label>
            <input id="clave-nueva" type={mostrar ? 'text' : 'password'} value={clave} autoComplete="new-password"
              minLength={CLAVE_MINIMA} maxLength={72} required disabled={procesando}
              onChange={(e) => { setClave(e.target.value); setProblema('') }}
              aria-invalid={problema ? true : undefined} aria-describedby="ayuda-clave-nueva" />
            <label className="mostrar-clave" htmlFor="mostrar-clave-nueva">
              <input id="mostrar-clave-nueva" type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
              Mostrar la clave
            </label>
            <p className="ayuda-campo" id="ayuda-clave-nueva">Mínimo {CLAVE_MINIMA} caracteres. La clave anterior deja de funcionar.</p>
          </div>
        )}
        {problema && <p className="mensaje mensaje-error" role="alert">{problema}</p>}
      </div>
      <div className="botones">
        <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={procesando}>Cancelar</button>
        <button type="submit" className={esBaja ? 'boton boton-peligro' : 'boton boton-primario'} disabled={procesando}>
          {procesando ? 'Guardando…' : esBaja ? 'Sí, dar de baja' : 'Guardar clave nueva'}
        </button>
      </div>
    </form>
  )
}

export default PaginaUsuarios
