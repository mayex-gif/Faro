import { useRef, useState } from 'react'
import { crearPunto } from '../api/infraestructura'
import Icono from './Icono'
import { TIPOS_LUGAR, estadoParaGuardar } from '../utils/lugares'
import { puntoEnLaZona, redondearCoordenada } from '../utils/zona'

// Los textos del formulario según lo que se agrega: desde la pestaña Luminarias solo luminarias,
// desde la pestaña Calles solo calles y desde "Todo el pueblo" cualquier lugar.
const TEXTOS = {
  LUMINARIA: { el: 'la luminaria', agregar: 'Agregar una luminaria', nuevo: 'Luminaria nueva', datos: 'Datos de la luminaria nueva',
    ejemplo: 'Luminaria San Martín y Belgrano', registrar: 'Registrar luminaria' },
  CALLE: { el: 'la calle', agregar: 'Agregar una calle', nuevo: 'Calle nueva', datos: 'Datos de la calle nueva',
    ejemplo: 'San Martín', registrar: 'Registrar calle' },
  general: { el: 'el lugar', agregar: 'Agregar un lugar', nuevo: 'Lugar nuevo', datos: 'Datos del lugar nuevo',
    ejemplo: 'Plaza San Martín', registrar: 'Registrar lugar' },
}

function FormularioLugarMapa({ tipo, puntos, geometria, onCambiarTipo, onDeshacerPunto, onGuardado, onCancelar,
  tipos, permitirAFuturo = false, aFuturo = false }) {
  // El tipo lo maneja la página (prop "tipo"), porque también cambia cómo se dibuja en el mapa.
  const [datos, setDatos] = useState(() => ({
    nombre: '', datosTecnicos: '', estadoOperativo: !aFuturo, instalada: !aFuturo,
  }))
  const textos = (tipos.length === 1 && TEXTOS[tipos[0]]) || TEXTOS.general
  const sinInstalar = tipo === 'LUMINARIA' && !datos.instalada
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const campoNombre = useRef(null)
  const dentro = puntos.length > 0 && puntos.every((punto) => puntoEnLaZona(punto.latitud, punto.longitud))
  const geometriaLista = Boolean(geometria) && dentro
  const instruccion = tipo === 'LUMINARIA'
    ? 'Tocá el mapa donde está la luminaria.'
    : tipo === 'CALLE'
      ? 'Tocá varios puntos siguiendo el recorrido de la calle.'
      : 'Tocá al menos tres puntos para marcar el contorno del lugar.'

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target
    setDatos((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }))
  }

  function elegirTipo(evento) {
    onCambiarTipo(evento.target.value)
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (!geometriaLista) return
    if (datos.nombre.trim() === '') {
      setError(`Escribí el nombre de ${textos.el}.`)
      campoNombre.current?.focus()
      return
    }
    setGuardando(true)
    setError('')
    try {
      const creado = await crearPunto({
        nombre: datos.nombre.trim(),
        tipo,
        datosTecnicos: datos.datosTecnicos.trim(),
        ...estadoParaGuardar({ ...datos, tipo }),
        ubicacion: geometria,
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
          <p className="panel-lugar-tipo">{textos.agregar}</p>
          <h2 id="titulo-lugar-nuevo">{textos.nuevo}</h2>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCancelar} disabled={guardando}
          aria-label={`Cancelar y no agregar ${textos.el}`}>
          <Icono nombre="cerrar" />
        </button>
      </div>

      <form className="panel-lugar-seccion" onSubmit={enviar} noValidate aria-busy={guardando}>
        {tipos.length > 1 && <div className="campo">
          <label htmlFor="lugar-nuevo-tipo">¿Qué querés registrar?</label>
          <select id="lugar-nuevo-tipo" value={tipo} onChange={elegirTipo} disabled={guardando}
            aria-describedby="ayuda-lugar-nuevo-tipo">
            {tipos.map((valor) => <option key={valor} value={valor}>{TIPOS_LUGAR[valor]}</option>)}
          </select>
          <p className="ayuda-campo" id="ayuda-lugar-nuevo-tipo">
            Lugar: una plaza o un espacio verde (se marca su contorno).
            {tipos.includes('LUMINARIA') && ' Si elegís Luminaria, el mapa pasa a la pestaña Luminarias.'}
          </p>
        </div>}

        <p className="paso-agregar"><Icono nombre="lugar" />{instruccion}</p>
        <div className={dentro ? 'ubicacion-elegida' : 'ubicacion-elegida ubicacion-fuera'} aria-live="polite">
          <strong>{!puntos.length ? 'Todavía no marcaste la forma' : !dentro ? 'Hay puntos fuera del pueblo' : `${puntos.length} ${puntos.length === 1 ? 'punto marcado' : 'puntos marcados'}`}</strong>
          {tipo === 'LUMINARIA' && puntos[0] && <span>{redondearCoordenada(puntos[0].latitud).toFixed(5)}, {redondearCoordenada(puntos[0].longitud).toFixed(5)}</span>}
          <span>{dentro ? 'La forma debe quedar dentro de Estación General Paz.' : 'Solo se aceptan formas dentro de Estación General Paz.'}</span>
        </div>

        {tipo !== 'LUMINARIA' && <div className="botones botones-dibujo-mapa">
          <button type="button" className="boton boton-secundario" onClick={onDeshacerPunto} disabled={guardando || puntos.length === 0}>Deshacer punto</button>
        </div>}

        <fieldset className="campos-lugar-mapa" disabled={guardando}>
          <legend className="solo-lectores">{textos.datos}</legend>
          <div className="campo">
            <label htmlFor="lugar-nuevo-nombre">Nombre <span aria-hidden="true">*</span></label>
            <input id="lugar-nuevo-nombre" name="nombre" ref={campoNombre} value={datos.nombre} onChange={cambiar}
              required aria-describedby="ayuda-lugar-nuevo-nombre" aria-invalid={error !== '' && datos.nombre.trim() === ''} />
            <p className="ayuda-campo" id="ayuda-lugar-nuevo-nombre">Ej.: {textos.ejemplo}.</p>
          </div>
          <div className="campo">
            <label htmlFor="lugar-nuevo-datos">Datos técnicos <span className="opcional">(opcional)</span></label>
            <textarea id="lugar-nuevo-datos" name="datosTecnicos" rows={2} value={datos.datosTecnicos} onChange={cambiar} />
          </div>
          {tipo === 'LUMINARIA' && permitirAFuturo && <label className="campo-check" htmlFor="lugar-nuevo-instalada">
            <input id="lugar-nuevo-instalada" type="checkbox" checked={!datos.instalada}
              onChange={(evento) => setDatos((anterior) => ({ ...anterior, instalada: !evento.target.checked, estadoOperativo: evento.target.checked }))} />
            <span><strong>Luminaria a futuro</strong><span>Planificada por el intendente, todavía no se puso. No lleva OT hasta marcarla como instalada.</span></span>
          </label>}
          <label className="campo-check" htmlFor="lugar-nuevo-funciona">
            <input id="lugar-nuevo-funciona" name="estadoOperativo" type="checkbox" disabled={sinInstalar}
              checked={datos.estadoOperativo && !sinInstalar} onChange={cambiar} />
            <span><strong>Funciona correctamente</strong><span>Desmarcala si está fuera de servicio.</span></span>
          </label>
        </fieldset>

        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="botones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>Cancelar</button>
          <button type="submit" className="boton boton-primario" disabled={guardando || !geometriaLista}>
            <Icono nombre="guardar" />{guardando ? 'Guardando…' : textos.registrar}
          </button>
        </div>
      </form>
    </section>
  )
}

export default FormularioLugarMapa
