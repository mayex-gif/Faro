import { useEffect, useState } from 'react'
import { modificarRegla } from '../api/mantenimiento'
import Icono from './Icono'
import CamposRecurrencia from './CamposRecurrencia'
import {
  PRIORIDADES, TIPOS_TRABAJO, formularioDesde, pedidoDesde, validarFormulario,
} from '../utils/mantenimiento'

// Edita una programación existente. Las nuevas se configuran desde el formulario de OT.
function FormularioRegla({ reglaEditando, lugares, cuadrillas, onGuardado, onCancelar }) {
  const [datos, setDatos] = useState(() => formularioDesde(reglaEditando))
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    document.getElementById('regla-titulo').focus({ preventScroll: true })
  }, [])

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  async function enviar(evento) {
    evento.preventDefault()
    const problemas = validarFormulario(datos)
    setErrores(problemas)
    if (Object.keys(problemas).length > 0) {
      setError('Revisá los campos marcados.')
      return
    }

    setGuardando(true)
    setError(null)
    try {
      const pedido = pedidoDesde(datos)
      const guardada = await modificarRegla(reglaEditando.id, pedido)
      onGuardado(`Se guardaron los cambios de "${guardada.titulo}".`)
    } catch (e) {
      console.error(e)
      if (e.estado === 400) setErrores(e.errores ?? {})
      setError([400, 404, 409].includes(e.estado) ? e.message
        : 'No pudimos guardar. Revisá la conexión e intentá nuevamente. Tus datos siguen en el formulario.')
    } finally {
      setGuardando(false)
    }
  }

  function marcaError(campo) {
    return errores[campo] ? { 'aria-invalid': true, 'aria-describedby': `error-regla-${campo}` } : {}
  }

  return (
    <form id="formulario-regla" className="panel formulario formulario-editando"
      onSubmit={enviar} aria-labelledby="titulo-formulario-regla" aria-busy={guardando} noValidate>
      <div className="panel-encabezado">
        <div className="titulo-con-icono">
          <span className="icono-panel"><Icono nombre="editar" /></span>
          <div>
            <h2 id="titulo-formulario-regla">Editar programación</h2>
            <p>Estás modificando: {reglaEditando.titulo}. Las OT ya generadas conservan sus datos.</p>
          </div>
        </div>
        <span className="etiqueta-edicion">En edición</span>
      </div>

      <fieldset className="formulario-cuerpo" disabled={guardando}>
        <legend className="solo-lectores">Datos de la regla</legend>
        <div className="campos campos-regla">
          <div className="campo campo-ancho">
            <label htmlFor="regla-titulo">Título <span aria-hidden="true">*</span></label>
            <input id="regla-titulo" name="titulo" value={datos.titulo} onChange={cambiar} required maxLength={150}
              placeholder="Ej.: Poda mensual plaza San Martín" {...marcaError('titulo')} />
            <ErrorCampo campo="titulo" mensaje={errores.titulo} />
          </div>
          <div className="campo campo-ancho">
            <label htmlFor="regla-descripcion">Descripción <span aria-hidden="true">*</span></label>
            <textarea id="regla-descripcion" name="descripcion" value={datos.descripcion} onChange={cambiar} required
              maxLength={500} {...marcaError('descripcion')} />
            <ErrorCampo campo="descripcion" mensaje={errores.descripcion} />
          </div>
          <div className="campo">
            <label htmlFor="regla-tipo">Tipo de trabajo <span aria-hidden="true">*</span></label>
            <select id="regla-tipo" name="tipoTrabajo" value={datos.tipoTrabajo} onChange={cambiar} required {...marcaError('tipoTrabajo')}>
              <option value="">Elegí el tipo</option>
              {TIPOS_TRABAJO.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
            </select>
            <ErrorCampo campo="tipoTrabajo" mensaje={errores.tipoTrabajo} />
          </div>
          <div className="campo">
            <label htmlFor="regla-prioridad">Prioridad <span aria-hidden="true">*</span></label>
            <select id="regla-prioridad" name="prioridad" value={datos.prioridad} onChange={cambiar} required {...marcaError('prioridad')}>
              <option value="">Elegí la prioridad</option>
              {PRIORIDADES.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
            </select>
            <ErrorCampo campo="prioridad" mensaje={errores.prioridad} />
          </div>
          <div className="campo">
            <label htmlFor="regla-lugar">Lugar <span aria-hidden="true">*</span></label>
            <select id="regla-lugar" name="lugarId" value={datos.lugarId} onChange={cambiar} required {...marcaError('lugarId')}>
              <option value="">Elegí el lugar</option>
              {lugares.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
            <ErrorCampo campo="lugarId" mensaje={errores.lugarId} />
          </div>
          <div className="campo">
            <label htmlFor="regla-cuadrilla">Cuadrilla <span className="opcional">(opcional)</span></label>
            <select id="regla-cuadrilla" name="cuadrillaId" value={datos.cuadrillaId} onChange={cambiar}>
              <option value="">Sin preasignar</option>
              {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <p className="ayuda-campo">Si se elige, cada OT que genere esta regla arranca ya asignada a esta cuadrilla.</p>
          </div>

          <CamposRecurrencia datos={datos} errores={errores} onCambiar={cambiar} prefijo="regla" />
        </div>
        <label className="campo-check">
          <input type="checkbox" name="activa" checked={datos.activa} onChange={cambiar} />
          <span><strong>Regla activa</strong><span>Si se destilda, es lo mismo que pausarla: no genera OT nuevas hasta reactivarla.</span></span>
        </label>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      </fieldset>

      <div className="formulario-pie">
        <p className="ayuda-campo"><span aria-hidden="true">*</span> Campos obligatorios</p>
        <div className="botones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>
            Cancelar edición
          </button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="guardar" />
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}

function ErrorCampo({ campo, mensaje }) {
  return mensaje ? <p className="error-campo" id={`error-regla-${campo}`}>{mensaje}</p> : null
}

export default FormularioRegla
