import { useState } from 'react'
import { actualizarPunto, crearPunto } from '../api/infraestructura'

// Valores con los que arranca el formulario cuando se crea un punto nuevo
const FORMULARIO_VACIO = {
  nombre: '',
  tipo: 'LUMINARIA',
  datosTecnicos: '',
  estadoOperativo: true,
  latitud: '',
  longitud: '',
}

// Convierte un punto que viene del backend en los valores del formulario
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

// Props:
// - puntoEditando: el punto a editar, o null si estamos creando uno nuevo
// - onGuardado: se llama cuando se guardó bien
// - onCancelar: se llama al tocar "Cancelar" (solo al editar)
function FormularioPunto({ puntoEditando, onGuardado, onCancelar }) {
  const editando = puntoEditando != null
  // Las líneas y polígonos no se pueden editar con latitud/longitud: se conservan como están
  const ubicacionCompleja = editando && puntoEditando.ubicacion?.type !== 'Point'

  // El formulario arranca vacío, o con los datos del punto si estamos editando
  const [datos, setDatos] = useState(() => (editando ? puntoAFormulario(puntoEditando) : FORMULARIO_VACIO))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  // Una sola función para todos los campos: usa el "name" del campo para saber qué actualizar
  function cambiar(evento) {
    const { name, value, type, checked } = evento.target
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
  }

  // Devuelve un mensaje de error, o null si está todo bien
  function validar() {
    if (datos.nombre.trim() === '') return 'El nombre es obligatorio.'
    if (ubicacionCompleja) return null // no se tocan latitud/longitud
    if (datos.latitud === '' || datos.longitud === '') return 'La latitud y la longitud son obligatorias.'
    const latitud = Number(datos.latitud)
    const longitud = Number(datos.longitud)
    if (latitud < -90 || latitud > 90) return 'La latitud tiene que estar entre -90 y 90.'
    if (longitud < -180 || longitud > 180) return 'La longitud tiene que estar entre -180 y 180.'
    return null
  }

  async function enviar(evento) {
    evento.preventDefault() // evita que el navegador recargue la página

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
        ? puntoEditando.ubicacion // conservamos la línea/polígono original
        : { type: 'Point', coordinates: [Number(datos.longitud), Number(datos.latitud)] },
    }

    setGuardando(true)
    setError(null)
    try {
      if (editando) {
        await actualizarPunto(puntoEditando.id, punto) // PUT
      } else {
        await crearPunto(punto) // POST
        setDatos(FORMULARIO_VACIO)
      }
      onGuardado()
    } catch (e) {
      setError(`No se pudo guardar: ${e.message}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className={editando ? 'formulario formulario-editando' : 'formulario'} onSubmit={enviar}>
      <h2>{editando ? `Editando: ${puntoEditando.nombre}` : 'Nuevo punto'}</h2>

      <div className="campos">
        <label>
          Nombre *
          <input name="nombre" value={datos.nombre} onChange={cambiar} placeholder="Ej: Plaza San Martín" />
        </label>

        <label>
          Tipo *
          <select name="tipo" value={datos.tipo} onChange={cambiar}>
            <option value="LUMINARIA">Luminaria</option>
            <option value="ESPACIO_VERDE">Espacio verde</option>
            <option value="CALLE">Calle</option>
          </select>
        </label>

        <label>
          Latitud *
          <input name="latitud" type="number" step="any" value={datos.latitud} onChange={cambiar}
            placeholder="Ej: -34.6037" disabled={ubicacionCompleja} />
        </label>

        <label>
          Longitud *
          <input name="longitud" type="number" step="any" value={datos.longitud} onChange={cambiar}
            placeholder="Ej: -58.3816" disabled={ubicacionCompleja} />
        </label>

        <label className="campo-ancho">
          Datos técnicos
          <textarea name="datosTecnicos" value={datos.datosTecnicos} onChange={cambiar} rows={2}
            placeholder="Ej: LED 100W, poste de 8 m" />
        </label>

        <label className="campo-check">
          <input name="estadoOperativo" type="checkbox" checked={datos.estadoOperativo} onChange={cambiar} />
          Funciona correctamente
        </label>
      </div>

      {ubicacionCompleja && (
        <p className="aviso">
          ℹ️ La ubicación de este punto es una línea o un polígono: se conserva como está.
          Se va a poder modificar desde el mapa.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <div className="botones">
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar'}
        </button>
        {editando && (
          <button type="button" className="boton-secundario" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export default FormularioPunto