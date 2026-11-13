import { useEffect, useState } from 'react'
import { actualizarPunto, crearPunto } from '../api/infraestructura'
import Icono from './Icono'
import { TIPOS_LUGAR, estadoParaGuardar, tiposDeCategoria } from '../utils/lugares'

const COORDENADA_VACIA = { latitud: '', longitud: '' }
const FORMULARIO_VACIO = {
  nombre: '', tipo: 'LUMINARIA', datosTecnicos: '', estadoOperativo: true, instalada: true,
  coordenadas: [COORDENADA_VACIA],
}

function coordenadasIniciales(tipo, ubicacion) {
  if (ubicacion?.type === 'Point') {
    return [{ longitud: String(ubicacion.coordinates[0]), latitud: String(ubicacion.coordinates[1]) }]
  }
  if (ubicacion?.type === 'LineString') {
    return ubicacion.coordinates.map(([longitud, latitud]) => ({ longitud: String(longitud), latitud: String(latitud) }))
  }
  // Una calle en varios tramos: se editan sus puntos uno detrás de otro y al guardar queda como una sola línea
  // (si no, el formulario arrancaría vacío y se perdería el recorrido)
  if (ubicacion?.type === 'MultiLineString') {
    return ubicacion.coordinates.flat(1).map(([longitud, latitud]) => ({ longitud: String(longitud), latitud: String(latitud) }))
  }
  if (ubicacion?.type === 'Polygon') {
    const anillo = ubicacion.coordinates[0] ?? []
    const cerrado = anillo.length > 1 && anillo[0][0] === anillo.at(-1)[0] && anillo[0][1] === anillo.at(-1)[1]
    return (cerrado ? anillo.slice(0, -1) : anillo)
      .map(([longitud, latitud]) => ({ longitud: String(longitud), latitud: String(latitud) }))
  }
  const minimo = tipo === 'CALLE' ? 2 : tipo === 'ESPACIO_VERDE' ? 3 : 1
  return Array.from({ length: minimo }, () => ({ ...COORDENADA_VACIA }))
}

function formularioVacio(tipos) {
  const tipo = tipos[0] ?? 'LUMINARIA'
  return { ...FORMULARIO_VACIO, tipo, coordenadas: coordenadasIniciales(tipo) }
}

function puntoAFormulario(punto) {
  return {
    nombre: punto.nombre ?? '',
    tipo: punto.tipo ?? 'LUMINARIA',
    datosTecnicos: punto.datosTecnicos ?? '',
    estadoOperativo: punto.estadoOperativo ?? true,
    instalada: punto.instalada !== false,
    coordenadas: coordenadasIniciales(punto.tipo, punto.ubicacion),
  }
}

function minimoPara(tipo) {
  return tipo === 'LUMINARIA' ? 1 : tipo === 'CALLE' ? 2 : 3
}

function geometriaDesde(datos) {
  const coordenadas = datos.coordenadas.map(({ longitud, latitud }) => [Number(longitud), Number(latitud)])
  if (datos.tipo === 'LUMINARIA') return { type: 'Point', coordinates: coordenadas[0] }
  if (datos.tipo === 'CALLE') return { type: 'LineString', coordinates: coordenadas }
  return { type: 'Polygon', coordinates: [[...coordenadas, coordenadas[0]]] }
}

// En Infraestructura se registran calles y áreas; Luminarias tiene su formulario propio.
function FormularioPunto({ puntoEditando, onGuardado, onCancelar, tipos = tiposDeCategoria() }) {
  const editando = puntoEditando != null
  const soloLuminarias = tipos.length === 1 && tipos[0] === 'LUMINARIA'
  const cosa = soloLuminarias ? 'luminaria' : 'lugar'
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
    setDatos((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }))
  }

  function cambiarTipo(evento) {
    const tipo = evento.target.value
    setDatos((anterior) => ({ ...anterior, tipo, coordenadas: coordenadasIniciales(tipo) }))
    setError(null)
  }

  function cambiarCoordenada(indice, campo, valor) {
    setDatos((anterior) => ({ ...anterior, coordenadas: anterior.coordenadas.map((punto, i) => i === indice ? { ...punto, [campo]: valor } : punto) }))
    setError(null)
  }

  function agregarCoordenada() {
    setDatos((anterior) => ({ ...anterior, coordenadas: [...anterior.coordenadas, { ...COORDENADA_VACIA }] }))
  }

  function quitarCoordenada(indice) {
    setDatos((anterior) => ({ ...anterior, coordenadas: anterior.coordenadas.filter((_, i) => i !== indice) }))
  }

  function validar() {
    if (datos.nombre.trim() === '') return 'El nombre es obligatorio.'
    if (datos.coordenadas.length < minimoPara(datos.tipo)) return `Ingresá al menos ${minimoPara(datos.tipo)} puntos para esta geometría.`
    for (const coordenada of datos.coordenadas) {
      if (coordenada.latitud === '' || coordenada.longitud === '') return 'Completá latitud y longitud en todos los puntos.'
      const latitud = Number(coordenada.latitud)
      const longitud = Number(coordenada.longitud)
      if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) return 'La latitud tiene que estar entre -90 y 90.'
      if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) return 'La longitud tiene que estar entre -180 y 180.'
    }
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
      ubicacion: geometriaDesde(datos),
    }

    setGuardando(true)
    setError(null)
    try {
      if (editando) await actualizarPunto(puntoEditando.id, punto)
      else {
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
                : 'Completá los datos para incorporar un lugar (plaza, espacio verde) o una calle.'}</p>
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
                <input id="nombre" name="nombre" value={datos.nombre} onChange={cambiar} required aria-describedby="ayuda-nombre" />
                <p className="ayuda-campo" id="ayuda-nombre">Usá un nombre fácil de reconocer. Ej.: {soloLuminarias ? 'Luminaria San Martín y Belgrano' : 'Plaza San Martín'}.</p>
              </div>
              {tipos.length > 1 && <div className="campo">
                <label htmlFor="tipo">Tipo de lugar <span aria-hidden="true">*</span></label>
                <select id="tipo" name="tipo" value={datos.tipo} onChange={cambiarTipo} required>
                  {tipos.map((tipo) => <option key={tipo} value={tipo}>{TIPOS_LUGAR[tipo]}</option>)}
                </select>
              </div>}
              <div className="campo campo-ancho">
                <label htmlFor="datos-tecnicos">Datos técnicos <span className="opcional">(opcional)</span></label>
                <textarea id="datos-tecnicos" name="datosTecnicos" value={datos.datosTecnicos} onChange={cambiar} rows={3} aria-describedby="ayuda-datos" />
                <p className="ayuda-campo" id="ayuda-datos">{soloLuminarias ? 'Por ejemplo: potencia, tipo de lámpara o altura del poste.' : 'Por ejemplo: superficie o características del espacio.'}</p>
              </div>
            </div>
          </section>

          <section className="seccion-formulario seccion-ubicacion" aria-labelledby="titulo-ubicacion">
            <h3 id="titulo-ubicacion"><Icono nombre="lugar" />Ubicación y estado</h3>
            <p className="ayuda-seccion" id="ayuda-coordenadas">Ingresá coordenadas en grados decimales con punto como separador. Un lugar necesita al menos tres vértices para marcar su contorno.</p>
            {datos.coordenadas.map((punto, indice) => <div className="campos coordenadas" key={indice}>
              <div className="campo">
                <label htmlFor={`latitud-${indice}`}>Latitud {indice + 1} <span aria-hidden="true">*</span></label>
                <input id={`latitud-${indice}`} type="number" step="any" min="-90" max="90" value={punto.latitud}
                  onChange={(evento) => cambiarCoordenada(indice, 'latitud', evento.target.value)} required aria-describedby="ayuda-coordenadas" placeholder="Ej: -31.1448" />
              </div>
              <div className="campo">
                <label htmlFor={`longitud-${indice}`}>Longitud {indice + 1} <span aria-hidden="true">*</span></label>
                <input id={`longitud-${indice}`} type="number" step="any" min="-180" max="180" value={punto.longitud}
                  onChange={(evento) => cambiarCoordenada(indice, 'longitud', evento.target.value)} required aria-describedby="ayuda-coordenadas" placeholder="Ej: -64.1441" />
              </div>
              {!esLuminaria && datos.coordenadas.length > minimoPara(datos.tipo) && <button type="button" className="boton boton-secundario" onClick={() => quitarCoordenada(indice)}>Quitar punto {indice + 1}</button>}
            </div>)}
            {!esLuminaria && <button type="button" className="boton boton-secundario" onClick={agregarCoordenada}>Agregar punto</button>}
            {esLuminaria && (
              <label className="campo-check" htmlFor="instalada">
                <input id="instalada" name="instalada" type="checkbox" checked={!datos.instalada}
                  onChange={(evento) => setDatos((anterior) => ({ ...anterior, instalada: !evento.target.checked }))} aria-describedby="ayuda-instalada" />
                <span><strong>Luminaria a futuro</strong><span id="ayuda-instalada">Planificada por el intendente, todavía no se puso. No se le pueden asignar OT hasta marcarla como instalada.</span></span>
              </label>
            )}
            <label className="campo-check" htmlFor="estado-operativo">
              <input id="estado-operativo" name="estadoOperativo" type="checkbox" disabled={sinInstalar}
                checked={datos.estadoOperativo && !sinInstalar} onChange={cambiar} aria-describedby="ayuda-estado" />
              <span><strong>Funciona correctamente</strong><span id="ayuda-estado">Desmarcá esta opción si está fuera de servicio.</span></span>
            </label>
          </section>
        </div>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      </fieldset>

      <div className="formulario-pie">
        <p className="ayuda-campo"><span aria-hidden="true">*</span> Campos obligatorios</p>
        <div className="botones">
          {editando && <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>Cancelar edición</button>}
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="guardar" />{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : soloLuminarias ? 'Registrar luminaria' : 'Registrar lugar'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormularioPunto
