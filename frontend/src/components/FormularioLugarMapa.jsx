import { useEffect, useRef, useState } from 'react'
import { crearPunto } from '../api/infraestructura'
import Icono from './Icono'
import { TIPOS_LUGAR } from '../utils/lugares'
import { puntoEnLaZona, redondearCoordenada, ubicacionDelPunto } from '../utils/zona'

// Formulario corto para registrar un lugar marcado en el mapa (pantalla Mapa).
// La ubicación sale del pin: no hace falta escribir coordenadas. Va en el panel de la derecha (compu)
// o en la hoja de abajo (celular).
// Props:
// - punto: { latitud, longitud } del pin, o null mientras todavía no se tocó el mapa
// - onGuardado(lugarCreado): el backend registró el lugar (responde el lugar con su id)
// - onCancelar(): salir sin guardar
function FormularioLugarMapa({ punto, onGuardado, onCancelar }) {
  const [datos, setDatos] = useState({ nombre: '', tipo: 'LUMINARIA', datosTecnicos: '', estadoOperativo: true })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const campoNombre = useRef(null)
  const hayPunto = punto != null
  const dentro = hayPunto && puntoEnLaZona(punto.latitud, punto.longitud)

  // Cuando aparece el pin, el cursor va al nombre (lo primero que hay que completar).
  useEffect(() => {
    if (hayPunto) campoNombre.current?.focus({ preventScroll: true })
  }, [hayPunto])

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (!dentro) return
    if (datos.nombre.trim() === '') {
      setError('Escribí el nombre del lugar.')
      campoNombre.current?.focus()
      return
    }
    setGuardando(true)
    setError('')
    try {
      const creado = await crearPunto({
        nombre: datos.nombre.trim(),
        tipo: datos.tipo,
        datosTecnicos: datos.datosTecnicos.trim(),
        estadoOperativo: datos.estadoOperativo,
        ubicacion: ubicacionDelPunto(punto),
      })
      onGuardado(creado)
    } catch (e) {
      console.error(e)
      if (e.estado === 403) setError('Tu usuario no tiene permiso para registrar lugares.')
      else if (e.estado === 400) setError(e.message)
      else setError('No pudimos guardar el lugar. Revisá la conexión e intentá nuevamente. Tus datos siguen en el formulario.')
      setGuardando(false)
    }
  }

  return (
    <section className="panel-lugar formulario-lugar-mapa" aria-labelledby="titulo-lugar-nuevo">
      <div className="panel-lugar-cabecera">
        <div className="panel-lugar-datos">
          <p className="panel-lugar-tipo">Agregar un lugar</p>
          <h2 id="titulo-lugar-nuevo">Lugar nuevo</h2>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCancelar} disabled={guardando} aria-label="Cancelar y no agregar el lugar">
          <Icono nombre="cerrar" />
        </button>
      </div>

      {!hayPunto ? (
        <div className="panel-lugar-seccion">
          <p className="paso-agregar"><Icono nombre="lugar" />Tocá el mapa donde está el lugar.</p>
          <p className="panel-lugar-vacio">Solo se pueden agregar lugares dentro de Estación General Paz.</p>
        </div>
      ) : (
        <form className="panel-lugar-seccion" onSubmit={enviar} noValidate aria-busy={guardando}>
          <div className={dentro ? 'ubicacion-elegida' : 'ubicacion-elegida ubicacion-fuera'} aria-live="polite">
            <strong>{dentro ? 'Ubicación marcada' : 'Ese punto queda fuera del pueblo'}</strong>
            <span>{redondearCoordenada(punto.latitud).toFixed(5)}, {redondearCoordenada(punto.longitud).toFixed(5)}</span>
            <span>{dentro ? 'Si no quedó justo, arrastrá el pin o tocá otro punto.' : 'Tocá un punto dentro de Estación General Paz.'}</span>
          </div>

          <fieldset className="campos-lugar-mapa" disabled={guardando}>
            <legend className="solo-lectores">Datos del lugar nuevo</legend>
            <div className="campo">
              <label htmlFor="lugar-nuevo-nombre">Nombre <span aria-hidden="true">*</span></label>
              <input id="lugar-nuevo-nombre" name="nombre" ref={campoNombre} value={datos.nombre} onChange={cambiar}
                required aria-describedby="ayuda-lugar-nuevo-nombre" aria-invalid={error !== '' && datos.nombre.trim() === ''} />
              <p className="ayuda-campo" id="ayuda-lugar-nuevo-nombre">Ej.: Luminaria San Martín y Belgrano.</p>
            </div>
            <div className="campo">
              <label htmlFor="lugar-nuevo-tipo">Tipo de lugar <span aria-hidden="true">*</span></label>
              <select id="lugar-nuevo-tipo" name="tipo" value={datos.tipo} onChange={cambiar}>
                {Object.entries(TIPOS_LUGAR).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="lugar-nuevo-datos">Datos técnicos <span className="opcional">(opcional)</span></label>
              <textarea id="lugar-nuevo-datos" name="datosTecnicos" rows={2} value={datos.datosTecnicos} onChange={cambiar} />
            </div>
            <label className="campo-check" htmlFor="lugar-nuevo-funciona">
              <input id="lugar-nuevo-funciona" name="estadoOperativo" type="checkbox" checked={datos.estadoOperativo} onChange={cambiar} />
              <span><strong>Funciona correctamente</strong><span>Desmarcala si está fuera de servicio.</span></span>
            </label>
          </fieldset>

          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          <div className="botones">
            <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>Cancelar</button>
            <button type="submit" className="boton boton-primario" disabled={guardando || !dentro}>
              <Icono nombre="guardar" />{guardando ? 'Guardando…' : 'Registrar lugar'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default FormularioLugarMapa
