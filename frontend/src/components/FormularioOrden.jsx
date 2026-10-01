import { useEffect, useState } from 'react'
import { actualizarOrden, crearOrden } from '../api/ordenesTrabajo'
import { ORIGENES, PRIORIDADES, TIPOS_TRABAJO } from '../utils/ordenesTrabajo'
import Icono from './Icono'

// Valores con los que arranca el formulario al crear una OT.
// Tipo, origen y lugar arrancan vacíos para obligar a elegirlos; la prioridad arranca en "Media".
const FORMULARIO_VACIO = {
  descripcion: '',
  tipo: '',
  origen: '',
  prioridad: 'MEDIA',
  lugarId: '',
}

// Convierte una OT que viene del backend en los valores del formulario
function ordenAFormulario(orden) {
  return {
    descripcion: orden.descripcion,
    tipo: orden.tipo,
    origen: orden.origen,
    prioridad: orden.prioridad,
    lugarId: String(orden.lugarId), // los <select> trabajan con texto
  }
}

// Props:
// - lugares: lista de lugares para el desplegable
// - errorLugares: true si no se pudieron cargar los lugares
// - ordenEditando: la OT a editar, o null si se está creando una nueva
// - onGuardado(texto): se llama cuando se guardó bien
// - onCancelar: se llama al cancelar la edición
function FormularioOrden({ lugares, errorLugares, ordenEditando, onGuardado, onCancelar }) {
  const editando = ordenEditando != null
  const [datos, setDatos] = useState(() => (editando ? ordenAFormulario(ordenEditando) : FORMULARIO_VACIO))
  const [errores, setErrores] = useState({}) // errores por campo: { descripcion: '...', tipo: '...' }
  const [error, setError] = useState(null)   // mensaje general, abajo del formulario
  const [guardando, setGuardando] = useState(false)

  const sinLugares = !errorLugares && lugares.length === 0

  useEffect(() => {
    if (editando) document.getElementById('descripcion').focus({ preventScroll: true })
  }, [editando])

  function cambiar(evento) {
    const { name, value } = evento.target
    setDatos({ ...datos, [name]: value })
    // Si el campo tenía un error y el usuario lo está corrigiendo, lo sacamos
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  // Revisa todos los campos y devuelve los errores encontrados ({} si está todo bien)
  function validar() {
    const encontrados = {}
    const descripcion = datos.descripcion.trim()
    if (descripcion === '') encontrados.descripcion = 'La descripción es obligatoria.'
    else if (descripcion.length > 500) encontrados.descripcion = 'La descripción no puede superar los 500 caracteres.'
    if (!datos.tipo) encontrados.tipo = 'Elegí el tipo de trabajo.'
    if (!datos.origen) encontrados.origen = 'Elegí de dónde surge la orden.'
    if (!datos.prioridad) encontrados.prioridad = 'Elegí la prioridad.'
    if (!datos.lugarId) encontrados.lugarId = 'Elegí el lugar donde se va a trabajar.'
    return encontrados
  }

  async function enviar(evento) {
    evento.preventDefault()

    const encontrados = validar()
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) {
      setError('Revisá los campos marcados en rojo.')
      return
    }

    const orden = {
      descripcion: datos.descripcion.trim(),
      tipo: datos.tipo,
      origen: datos.origen,
      prioridad: datos.prioridad,
      lugarId: Number(datos.lugarId),
    }

    setGuardando(true)
    setError(null)
    try {
      if (editando) {
        await actualizarOrden(ordenEditando.id, orden)
      } else {
        await crearOrden(orden)
        setDatos(FORMULARIO_VACIO)
      }
      onGuardado(editando ? 'Los cambios de la orden se guardaron correctamente.' : 'La orden de trabajo se registró correctamente.')
    } catch (e) {
      console.error(e)
      // Si el backend devolvió errores por campo (400), los mostramos debajo de cada campo
      if (e.errores && Object.keys(e.errores).length > 0) setErrores(e.errores)
      // 400 y 404 traen un mensaje claro del backend; para el resto, uno genérico
      setError(e.estado === 400 || e.estado === 404
        ? e.message
        : 'No pudimos guardar la orden. Revisá la conexión e intentá nuevamente. Tus datos siguen en el formulario.')
    } finally {
      setGuardando(false)
    }
  }

  // Ayuda para no repetir: devuelve los atributos de accesibilidad de un campo
  // (si tiene error, lo marca como inválido y lo vincula a su mensaje de error)
  function accesibilidad(campo, idAyuda) {
    return {
      'aria-invalid': Boolean(errores[campo]),
      'aria-describedby': errores[campo] ? `error-${campo}` : idAyuda,
    }
  }

  // Muestra el error del campo, o su ayuda si no hay error
  function mensajeCampo(campo, idAyuda, ayuda) {
    if (errores[campo]) return <p className="error-campo" id={`error-${campo}`}>{errores[campo]}</p>
    return ayuda ? <p className="ayuda-campo" id={idAyuda}>{ayuda}</p> : null
  }

  return (
    <form id="formulario-orden" className={editando ? 'panel formulario formulario-editando' : 'panel formulario'}
      onSubmit={enviar} noValidate aria-labelledby="titulo-formulario-orden" aria-busy={guardando}>
      <div className="panel-encabezado">
        <div className="titulo-con-icono">
          <span className="icono-panel"><Icono nombre={editando ? 'editar' : 'agregar'} /></span>
          <div>
            <h2 id="titulo-formulario-orden">{editando ? `Editar orden #${ordenEditando.id}` : 'Registrar una orden de trabajo'}</h2>
            <p>{editando ? `Estás modificando: ${ordenEditando.descripcion}` : 'Indicá qué hay que hacer, dónde y con qué urgencia.'}</p>
          </div>
        </div>
        {editando && <span className="etiqueta-edicion">En edición</span>}
      </div>

      <fieldset className="formulario-cuerpo" disabled={guardando}>
        <legend className="solo-lectores">Datos de la orden de trabajo</legend>

        {errorLugares && (
          <p className="mensaje mensaje-error" role="alert">
            No pudimos cargar la lista de lugares. Volvé a abrir la pantalla para intentar nuevamente.
          </p>
        )}
        {sinLugares && (
          <p className="mensaje mensaje-informacion">
            Todavía no hay lugares registrados. Primero registrá uno en la pantalla de Infraestructura.
          </p>
        )}

        <div className="formulario-secciones">
          {/* ---------- Sección 1: qué hay que hacer ---------- */}
          <section className="seccion-formulario" aria-labelledby="titulo-trabajo">
            <h3 id="titulo-trabajo">Trabajo a realizar</h3>
            <div className="campos">
              <div className="campo campo-ancho">
                <label htmlFor="descripcion">Descripción <span aria-hidden="true">*</span></label>
                <textarea id="descripcion" name="descripcion" rows={3} maxLength={500}
                  value={datos.descripcion} onChange={cambiar} required
                  {...accesibilidad('descripcion', 'ayuda-descripcion')} />
                {mensajeCampo('descripcion', 'ayuda-descripcion', 'Qué hay que hacer. Ej.: Cortar el pasto del sector juegos.')}
              </div>

              <div className="campo campo-ancho">
                <label htmlFor="tipo">Tipo de trabajo <span aria-hidden="true">*</span></label>
                <select id="tipo" name="tipo" value={datos.tipo} onChange={cambiar} required
                  {...accesibilidad('tipo')}>
                  <option value="">Elegí un tipo…</option>
                  {TIPOS_TRABAJO.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
                  ))}
                </select>
                {mensajeCampo('tipo')}
              </div>
            </div>
          </section>

          {/* ---------- Sección 2: dónde, de dónde surge y urgencia ---------- */}
          <section className="seccion-formulario" aria-labelledby="titulo-lugar-prioridad">
            <h3 id="titulo-lugar-prioridad"><Icono nombre="lugar" />Lugar y prioridad</h3>
            <div className="campos">
              <div className="campo campo-ancho">
                <label htmlFor="lugarId">Lugar <span aria-hidden="true">*</span></label>
                <select id="lugarId" name="lugarId" value={datos.lugarId} onChange={cambiar} required
                  disabled={sinLugares || errorLugares} {...accesibilidad('lugarId', 'ayuda-lugar')}>
                  <option value="">Elegí un lugar…</option>
                  {lugares.map((lugar) => (
                    <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>
                  ))}
                </select>
                {mensajeCampo('lugarId', 'ayuda-lugar', 'El lugar del pueblo donde se va a realizar el trabajo.')}
              </div>

              <div className="campo">
                <label htmlFor="origen">Origen <span aria-hidden="true">*</span></label>
                <select id="origen" name="origen" value={datos.origen} onChange={cambiar} required
                  {...accesibilidad('origen')}>
                  <option value="">Elegí el origen…</option>
                  {ORIGENES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
                  ))}
                </select>
                {mensajeCampo('origen')}
              </div>

              <div className="campo">
                <label htmlFor="prioridad">Prioridad <span aria-hidden="true">*</span></label>
                <select id="prioridad" name="prioridad" value={datos.prioridad} onChange={cambiar} required
                  {...accesibilidad('prioridad')}>
                  {PRIORIDADES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
                  ))}
                </select>
                {mensajeCampo('prioridad')}
              </div>
            </div>
          </section>
        </div>

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
          <button type="submit" className="boton boton-primario" disabled={guardando || sinLugares}>
            <Icono nombre="guardar" />
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar orden'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormularioOrden