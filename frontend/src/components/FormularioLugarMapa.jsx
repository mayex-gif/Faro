import { useEffect, useRef, useState } from 'react'
import { crearPunto } from '../api/infraestructura'
import Icono from './Icono'
import { TIPOS_LUGAR, estadoParaGuardar, tiposDeCategoria } from '../utils/lugares'
import { puntoEnLaZona, redondearCoordenada, ubicacionDelPunto } from '../utils/zona'

// Formulario corto para registrar un lugar marcado en el mapa (pantalla Mapa).
// La ubicación sale del pin: no hace falta escribir coordenadas. Va en el panel de la derecha (compu)
// o en la hoja de abajo (celular).
// Props:
// - punto: { latitud, longitud } del pin, o null mientras todavía no se tocó el mapa
// - onGuardado(lugarCreado): el backend registró el lugar (responde el lugar con su id)
// - onCancelar(): salir sin guardar
// - tipos: qué se puede registrar (pestaña "Todo el pueblo": espacios verdes y calles; pestaña Luminarias: luminarias)
function FormularioLugarMapa({ punto, onGuardado, onCancelar, tipos = tiposDeCategoria() }) {
  const [datos, setDatos] = useState({ nombre: '', tipo: tipos[0], datosTecnicos: '', estadoOperativo: true, instalada: true })
  const soloLuminarias = tipos.length === 1 && tipos[0] === 'LUMINARIA'
  const sinInstalar = datos.tipo === 'LUMINARIA' && !datos.instalada
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
      setError(soloLuminarias ? 'Escribí el nombre de la luminaria.' : 'Escribí el nombre del lugar.')
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
        ...estadoParaGuardar(datos),
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
          <p className="panel-lugar-tipo">{soloLuminarias ? 'Agregar una luminaria' : 'Agregar un lugar'}</p>
          <h2 id="titulo-lugar-nuevo">{soloLuminarias ? 'Luminaria nueva' : 'Lugar nuevo'}</h2>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCancelar} disabled={guardando} aria-label={soloLuminarias ? 'Cancelar y no agregar la luminaria' : 'Cancelar y no agregar el lugar'}>
          <Icono nombre="cerrar" />
        </button>
      </div>

      {!hayPunto ? (
        <div className="panel-lugar-seccion">
          <p className="paso-agregar"><Icono nombre="lugar" />Tocá el mapa donde está {soloLuminarias ? 'la luminaria' : 'el lugar'}.</p>
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
            <legend className="solo-lectores">{soloLuminarias ? 'Datos de la luminaria nueva' : 'Datos del lugar nuevo'}</legend>
            <div className="campo">
              <label htmlFor="lugar-nuevo-nombre">Nombre <span aria-hidden="true">*</span></label>
              <input id="lugar-nuevo-nombre" name="nombre" ref={campoNombre} value={datos.nombre} onChange={cambiar}
                required aria-describedby="ayuda-lugar-nuevo-nombre" aria-invalid={error !== '' && datos.nombre.trim() === ''} />
              <p className="ayuda-campo" id="ayuda-lugar-nuevo-nombre">Ej.: {soloLuminarias ? 'Luminaria San Martín y Belgrano' : 'Plaza San Martín'}.</p>
            </div>
            {tipos.length > 1 && (
              <div className="campo">
                <label htmlFor="lugar-nuevo-tipo">Tipo de lugar <span aria-hidden="true">*</span></label>
                <select id="lugar-nuevo-tipo" name="tipo" value={datos.tipo} onChange={cambiar}>
                  {tipos.map((tipo) => <option key={tipo} value={tipo}>{TIPOS_LUGAR[tipo]}</option>)}
                </select>
              </div>
            )}
            <div className="campo">
              <label htmlFor="lugar-nuevo-datos">Datos técnicos <span className="opcional">(opcional)</span></label>
              <textarea id="lugar-nuevo-datos" name="datosTecnicos" rows={2} value={datos.datosTecnicos} onChange={cambiar} />
            </div>
            {datos.tipo === 'LUMINARIA' && (
              <label className="campo-check" htmlFor="lugar-nuevo-instalada">
                <input id="lugar-nuevo-instalada" type="checkbox" checked={!datos.instalada}
                  onChange={(evento) => setDatos({ ...datos, instalada: !evento.target.checked })} />
                <span><strong>Todavía no está instalada</strong><span>Marcala si está planificada pero falta ponerla.</span></span>
              </label>
            )}
            <label className="campo-check" htmlFor="lugar-nuevo-funciona">
              <input id="lugar-nuevo-funciona" name="estadoOperativo" type="checkbox" disabled={sinInstalar}
                checked={datos.estadoOperativo && !sinInstalar} onChange={cambiar} />
              <span><strong>Funciona correctamente</strong><span>Desmarcala si está fuera de servicio.</span></span>
            </label>
          </fieldset>

          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          <div className="botones">
            <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>Cancelar</button>
            <button type="submit" className="boton boton-primario" disabled={guardando || !dentro}>
              <Icono nombre="guardar" />{guardando ? 'Guardando…' : soloLuminarias ? 'Registrar luminaria' : 'Registrar lugar'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default FormularioLugarMapa
