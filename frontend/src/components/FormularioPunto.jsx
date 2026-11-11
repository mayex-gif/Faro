import { useEffect, useState } from 'react'
import { actualizarPunto, crearPunto } from '../api/infraestructura'
import Icono from './Icono'
import { TIPOS_LUGAR, estadoParaGuardar, tiposDeCategoria } from '../utils/lugares'

// Valores con los que arranca el formulario cuando se crea un punto nuevo.
// El tipo arranca en el primero de la pantalla (ver formularioVacio).
const FORMULARIO_VACIO = {
  nombre: '',
  tipo: 'LUMINARIA',
  datosTecnicos: '',
  estadoOperativo: true,
  instalada: true, // solo luminarias: false = luminaria a futuro (la planificó el intendente, todavía no se puso)
  latitud: '',
  longitud: '',
}

function formularioVacio(tipos) {
  return { ...FORMULARIO_VACIO, tipo: tipos[0] }
}

function puntoAFormulario(punto) {
  const esPunto = punto.ubicacion?.type === 'Point'
  const [longitud, latitud] = esPunto ? punto.ubicacion.coordinates : ['', ''] // GeoJSON: [longitud, latitud]
  return {
    nombre: punto.nombre ?? '',
    tipo: punto.tipo ?? 'LUMINARIA',
    datosTecnicos: punto.datosTecnicos ?? '',
    estadoOperativo: punto.estadoOperativo ?? true,
    instalada: punto.instalada !== false,
    latitud: String(latitud),
    longitud: String(longitud),
  }
}

// tipos: los tipos de lugar que se pueden cargar en esta pantalla (Infraestructura: espacios verdes y calles;
// Luminarias: solo luminarias). Con un solo tipo, no se muestra la lista "Tipo de lugar".
function FormularioPunto({ puntoEditando, onGuardado, onCancelar, tipos = tiposDeCategoria() }) {
  const editando = puntoEditando != null
  const soloLuminarias = tipos.length === 1 && tipos[0] === 'LUMINARIA'
  const cosa = soloLuminarias ? 'luminaria' : 'lugar'
  // Las líneas y polígonos conservan su geometría original.
  const ubicacionCompleja = editando && puntoEditando.ubicacion?.type !== 'Point'
  const [datos, setDatos] = useState(() => (editando ? puntoAFormulario(puntoEditando) : formularioVacio(tipos)))
  const esLuminaria = datos.tipo === 'LUMINARIA'
  const sinInstalar = esLuminaria && !datos.instalada
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (editando) document.getElementById('nombre').focus({ preventScroll: true })
  }, [editando])

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
  }

  function validar() {
    if (datos.nombre.trim() === '') return 'El nombre es obligatorio.'
    if (ubicacionCompleja) return null
    if (datos.latitud === '' || datos.longitud === '') return 'La latitud y la longitud son obligatorias.'
    const latitud = Number(datos.latitud)
    const longitud = Number(datos.longitud)
    if (latitud < -90 || latitud > 90) return 'La latitud tiene que estar entre -90 y 90.'
    if (longitud < -180 || longitud > 180) return 'La longitud tiene que estar entre -180 y 180.'
    return null
  }

  async function enviar(evento) {
    evento.preventDefault()
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }

    const punto = {
      nombre: datos.nombre.trim(),
      tipo: datos.tipo,
      datosTecnicos: datos.datosTecnicos.trim(),
      ...estadoParaGuardar(datos),
      ubicacion: ubicacionCompleja
        ? puntoEditando.ubicacion
        : { type: 'Point', coordinates: [Number(datos.longitud), Number(datos.latitud)] },
    }

    setGuardando(true)
    setError(null)
    try {
      if (editando) {
        await actualizarPunto(puntoEditando.id, punto)
      } else {
        await crearPunto(punto)
        setDatos(formularioVacio(tipos))
      }
      onGuardado(editando ? 'Los cambios se guardaron correctamente.' : `${soloLuminarias ? 'La luminaria' : 'El lugar'} se registró correctamente.`)
    } catch (e) {
      console.error(e)
      setError(e?.estado === 400 && e.message ? e.message
        : `No pudimos guardar ${soloLuminarias ? 'la luminaria' : 'el lugar'}. Revisá la conexión e intentá nuevamente. Tus datos siguen en el formulario.`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form id="formulario-punto" className={editando ? 'panel formulario formulario-editando' : 'panel formulario'}
      onSubmit={enviar} aria-labelledby="titulo-formulario" aria-busy={guardando}>
      <div className="panel-encabezado">
        <div className="titulo-con-icono">
          <span className="icono-panel"><Icono nombre={editando ? 'editar' : 'agregar'} /></span>
          <div>
            <h2 id="titulo-formulario">{editando ? `Editar ${cosa}` : `Registrar ${soloLuminarias ? 'una luminaria' : 'un lugar'}`}</h2>
            <p>{editando ? `Estás modificando: ${puntoEditando.nombre}`
              : soloLuminarias ? 'Completá los datos para incorporar una luminaria del alumbrado público.'
                : 'Completá los datos para incorporar un espacio verde o una calle.'}</p>
          </div>
        </div>
        {editando && <span className="etiqueta-edicion">En edición</span>}
      </div>

      <fieldset className="formulario-cuerpo" disabled={guardando}>
        <legend className="solo-lectores">{soloLuminarias ? 'Datos de la luminaria' : 'Datos del lugar'}</legend>
        <div className="formulario-secciones">
          <section className="seccion-formulario" aria-labelledby="titulo-identificacion">
            <h3 id="titulo-identificacion">{soloLuminarias ? 'Información de la luminaria' : 'Información del lugar'}</h3>
            <div className="campos">
              <div className="campo campo-nombre">
                <label htmlFor="nombre">Nombre <span aria-hidden="true">*</span></label>
                <input id="nombre" name="nombre" value={datos.nombre} onChange={cambiar}
                  required aria-describedby="ayuda-nombre" />
                <p className="ayuda-campo" id="ayuda-nombre">
                  Usá un nombre fácil de reconocer. Ej.: {soloLuminarias ? 'Luminaria San Martín y Belgrano' : 'Plaza San Martín'}.
                </p>
              </div>
              {tipos.length > 1 && (
                <div className="campo">
                  <label htmlFor="tipo">Tipo de lugar <span aria-hidden="true">*</span></label>
                  <select id="tipo" name="tipo" value={datos.tipo} onChange={cambiar} required>
                    {tipos.map((tipo) => <option key={tipo} value={tipo}>{TIPOS_LUGAR[tipo]}</option>)}
                  </select>
                </div>
              )}
              <div className="campo campo-ancho">
                <label htmlFor="datos-tecnicos">Datos técnicos <span className="opcional">(opcional)</span></label>
                <textarea id="datos-tecnicos" name="datosTecnicos" value={datos.datosTecnicos}
                  onChange={cambiar} rows={3} aria-describedby="ayuda-datos" />
                <p className="ayuda-campo" id="ayuda-datos">
                  {soloLuminarias ? 'Por ejemplo: potencia, tipo de lámpara o altura del poste.' : 'Por ejemplo: superficie, tipo de calzada o características del espacio.'}
                </p>
              </div>
            </div>
          </section>

          <section className="seccion-formulario seccion-ubicacion" aria-labelledby="titulo-ubicacion">
            <h3 id="titulo-ubicacion"><Icono nombre="lugar" />Ubicación y estado</h3>
            <p className="ayuda-seccion" id="ayuda-coordenadas">Ingresá las coordenadas en grados decimales, usando un punto como separador.</p>
            <div className="campos coordenadas">
              <div className="campo">
                <label htmlFor="latitud">Latitud <span aria-hidden="true">*</span></label>
                <input id="latitud" name="latitud" type="number" step="any" min="-90" max="90"
                  value={datos.latitud} onChange={cambiar} disabled={ubicacionCompleja}
                  required={!ubicacionCompleja} aria-describedby="ayuda-coordenadas" placeholder="Ej: -31.1448"/>
              </div>
              <div className="campo">
                <label htmlFor="longitud">Longitud <span aria-hidden="true">*</span></label>
                <input id="longitud" name="longitud" type="number" step="any" min="-180" max="180"
                  value={datos.longitud} onChange={cambiar} disabled={ubicacionCompleja}
                  required={!ubicacionCompleja} aria-describedby="ayuda-coordenadas" placeholder="Ej: -64.1441"/>
              </div>
            </div>
            {esLuminaria && (
              <label className="campo-check" htmlFor="instalada">
                <input id="instalada" name="instalada" type="checkbox" checked={!datos.instalada}
                  onChange={(evento) => setDatos({ ...datos, instalada: !evento.target.checked })} aria-describedby="ayuda-instalada" />
                <span>
                  <strong>Luminaria a futuro</strong>
                  <span id="ayuda-instalada">Planificada por el intendente, todavía no se puso. No se le pueden asignar OT hasta marcarla como instalada.</span>
                </span>
              </label>
            )}
            <label className="campo-check" htmlFor="estado-operativo">
              <input id="estado-operativo" name="estadoOperativo" type="checkbox" disabled={sinInstalar}
                checked={datos.estadoOperativo && !sinInstalar} onChange={cambiar} aria-describedby="ayuda-estado" />
              <span>
                <strong>Funciona correctamente</strong>
                <span id="ayuda-estado">Desmarcá esta opción si está fuera de servicio.</span>
              </span>
            </label>
            {ubicacionCompleja && (
              <p className="mensaje mensaje-informacion">
                Este lugar tiene una ubicación de línea o polígono. Se conserva sin cambios al guardar.
              </p>
            )}
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
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="guardar" />
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : soloLuminarias ? 'Registrar luminaria' : 'Registrar lugar'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormularioPunto
