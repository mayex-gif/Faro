import { useEffect, useState } from 'react'
import { actualizarPunto, crearPunto } from '../api/infraestructura'
import Icono from './Icono'

// Valores con los que arranca el formulario cuando se crea un punto nuevo.
const FORMULARIO_VACIO = {
  nombre: '',
  tipo: 'LUMINARIA',
  datosTecnicos: '',
  estadoOperativo: true,
  latitud: '',
  longitud: '',
}

function puntoAFormulario(punto) {
  const esPunto = punto.ubicacion?.type === 'Point'
  const [longitud, latitud] = esPunto ? punto.ubicacion.coordinates : ['', ''] // GeoJSON: [longitud, latitud]
  return {
    nombre: punto.nombre ?? '',
    tipo: punto.tipo ?? 'LUMINARIA',
    datosTecnicos: punto.datosTecnicos ?? '',
    estadoOperativo: punto.estadoOperativo ?? true,
    latitud: String(latitud),
    longitud: String(longitud),
  }
}

function FormularioPunto({ puntoEditando, onGuardado, onCancelar }) {
  const editando = puntoEditando != null
  // Las líneas y polígonos conservan su geometría original.
  const ubicacionCompleja = editando && puntoEditando.ubicacion?.type !== 'Point'
  const [datos, setDatos] = useState(() => (editando ? puntoAFormulario(puntoEditando) : FORMULARIO_VACIO))
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
      estadoOperativo: datos.estadoOperativo,
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
        setDatos(FORMULARIO_VACIO)
      }
      onGuardado(editando ? 'Los cambios se guardaron correctamente.' : 'El lugar se registró correctamente.')
    } catch (e) {
      console.error(e)
      setError('No pudimos guardar el lugar. Revisá la conexión e intentá nuevamente. Tus datos siguen en el formulario.')
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
            <h2 id="titulo-formulario">{editando ? 'Editar lugar' : 'Registrar un lugar'}</h2>
            <p>{editando ? `Estás modificando: ${puntoEditando.nombre}` : 'Completá los datos para incorporar un punto de infraestructura.'}</p>
          </div>
        </div>
        {editando && <span className="etiqueta-edicion">En edición</span>}
      </div>

      <fieldset className="formulario-cuerpo" disabled={guardando}>
        <legend className="solo-lectores">Datos del lugar</legend>
        <div className="formulario-secciones">
          <section className="seccion-formulario" aria-labelledby="titulo-identificacion">
            <h3 id="titulo-identificacion">Información del lugar</h3>
            <div className="campos">
              <div className="campo campo-nombre">
                <label htmlFor="nombre">Nombre <span aria-hidden="true">*</span></label>
                <input id="nombre" name="nombre" value={datos.nombre} onChange={cambiar}
                  required aria-describedby="ayuda-nombre" />
                <p className="ayuda-campo" id="ayuda-nombre">Usá un nombre fácil de reconocer. Ej.: Plaza San Martín.</p>
              </div>
              <div className="campo">
                <label htmlFor="tipo">Tipo de lugar <span aria-hidden="true">*</span></label>
                <select id="tipo" name="tipo" value={datos.tipo} onChange={cambiar} required>
                  <option value="LUMINARIA">Luminaria</option>
                  <option value="ESPACIO_VERDE">Espacio verde</option>
                  <option value="CALLE">Calle</option>
                </select>
              </div>
              <div className="campo campo-ancho">
                <label htmlFor="datos-tecnicos">Datos técnicos <span className="opcional">(opcional)</span></label>
                <textarea id="datos-tecnicos" name="datosTecnicos" value={datos.datosTecnicos}
                  onChange={cambiar} rows={3} aria-describedby="ayuda-datos" />
                <p className="ayuda-campo" id="ayuda-datos">Por ejemplo: potencia de la luminaria, altura del poste o características del espacio.</p>
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
                  required={!ubicacionCompleja} aria-describedby="ayuda-coordenadas" />
              </div>
              <div className="campo">
                <label htmlFor="longitud">Longitud <span aria-hidden="true">*</span></label>
                <input id="longitud" name="longitud" type="number" step="any" min="-180" max="180"
                  value={datos.longitud} onChange={cambiar} disabled={ubicacionCompleja}
                  required={!ubicacionCompleja} aria-describedby="ayuda-coordenadas" />
              </div>
            </div>
            <label className="campo-check" htmlFor="estado-operativo">
              <input id="estado-operativo" name="estadoOperativo" type="checkbox"
                checked={datos.estadoOperativo} onChange={cambiar} aria-describedby="ayuda-estado" />
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
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar lugar'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormularioPunto
