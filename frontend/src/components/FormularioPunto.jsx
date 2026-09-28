import { useState } from 'react'
import { crearPunto } from '../api/infraestructura'

// Valores con los que arranca el formulario (y a los que vuelve después de guardar)
const FORMULARIO_VACIO = {
  nombre: '',
  tipo: 'LUMINARIA',
  datosTecnicos: '',
  estadoOperativo: true,
  latitud: '',
  longitud: '',
}

function FormularioPunto({ onGuardado }) {
  const [datos, setDatos] = useState(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  // Una sola función para todos los campos: usa el "name" del campo
  // para saber qué dato actualizar
  function cambiar(evento) {
    const { name, value, type, checked } = evento.target
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
  }

  // Revisa que los datos tengan sentido antes de mandarlos.
  // Devuelve un mensaje de error, o null si está todo bien.
  function validar() {
    if (datos.nombre.trim() === '') return 'El nombre es obligatorio.'
    if (datos.latitud === '' || datos.longitud === '') return 'La latitud y la longitud son obligatorias.'
    const latitud = Number(datos.latitud)
    const longitud = Number(datos.longitud)
    if (latitud < -90 || latitud > 90) return 'La latitud tiene que estar entre -90 y 90.'
    if (longitud < -180 || longitud > 180) return 'La longitud tiene que estar entre -180 y 180.'
    return null
  }

  async function enviar(evento) {
    evento.preventDefault() // evita que el navegador recargue la página (comportamiento por defecto de un form)

    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }

    // Armamos el punto con el formato que espera el backend (ubicación en GeoJSON)
    const punto = {
      nombre: datos.nombre.trim(),
      tipo: datos.tipo,
      datosTecnicos: datos.datosTecnicos.trim(),
      estadoOperativo: datos.estadoOperativo,
      ubicacion: {
        type: 'Point',
        coordinates: [Number(datos.longitud), Number(datos.latitud)], // GeoJSON: [longitud, latitud]
      },
    }

    setGuardando(true)
    setError(null)
    try {
      await crearPunto(punto)
      setDatos(FORMULARIO_VACIO) // limpiamos el formulario
      onGuardado() // le avisamos a App que recargue la tabla
    } catch (e) {
      setError(`No se pudo guardar: ${e.message}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>Nuevo punto</h2>

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
          <input name="latitud" type="number" step="any" value={datos.latitud} onChange={cambiar} placeholder="Ej: -34.6037" />
        </label>

        <label>
          Longitud *
          <input name="longitud" type="number" step="any" value={datos.longitud} onChange={cambiar} placeholder="Ej: -58.3816" />
        </label>

        <label className="campo-ancho">
          Datos técnicos
          <textarea name="datosTecnicos" value={datos.datosTecnicos} onChange={cambiar} rows={2} placeholder="Ej: LED 100W, poste de 8 m" />
        </label>

        <label className="campo-check">
          <input name="estadoOperativo" type="checkbox" checked={datos.estadoOperativo} onChange={cambiar} />
          Funciona correctamente
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}

export default FormularioPunto