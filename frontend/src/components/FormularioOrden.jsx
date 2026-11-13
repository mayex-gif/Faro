import { useEffect, useMemo, useRef, useState } from 'react'
import { actualizarOrden } from '../api/ordenesTrabajo'
import { crearRegla } from '../api/mantenimiento'
import { enviarOperacion } from '../api/sincronizacion'
import { ORIGENES, PRIORIDADES, TIPOS_TRABAJO } from '../utils/ordenesTrabajo'
import Icono from './Icono'
import { useSesion } from '../context/useSesion'
import { guardarOperacion } from '../offline/cola'
import { REINTENTAR, clasificarError, crearAltaOrden } from '../offline/datosCola'
import { puedeGestionarMantenimiento } from '../utils/permisos'
import { fechaProgramada, pedidoDeProgramacion, recurrenciaInicial, validarProgramacion } from '../utils/recurrencia'
import { textoTramo, tramoEntre } from '../utils/tramos'
import { MODOS_UBICACION, callesOfrecidas, crucesDeLaCalle, pedidoDeUbicacion, ubicacionInicial, validarUbicacion } from '../utils/ubicacionEnCalle'
import SeccionRecurrencia from './SeccionRecurrencia'
import '../estilos-mantenimiento.css'
import '../estilos-calles.css'

// Valores con los que arranca el formulario al crear una OT.
// Tipo, origen y lugar arrancan vacíos para obligar a elegirlos; la prioridad arranca en "Media".
const FORMULARIO_VACIO = {
  descripcion: '',
  tipo: '',
  origen: '',
  prioridad: 'MEDIA',
  lugarId: '',
  modoUbicacion: 'NINGUNA',
  calleEntre1: '',
  calleEntre2: '',
  altura: '',
  tramo: null, // solo calles: la parte de la calle (GeoJSON LineString); null = toda la calle
  montoAproximado: '',
}

// Al cambiar de lugar se borra la ubicación dentro de la calle (era de la calle anterior)
const SIN_UBICACION = { modoUbicacion: 'NINGUNA', calleEntre1: '', calleEntre2: '', altura: '', tramo: null }

// Convierte una OT que viene del backend en los valores del formulario
function ordenAFormulario(orden) {
  return {
    descripcion: orden.descripcion,
    tipo: orden.tipo,
    origen: orden.origen,
    prioridad: orden.prioridad,
    lugarId: String(orden.lugarId), // los <select> trabajan con texto
    ...ubicacionInicial(orden), // modoUbicacion, calleEntre1, calleEntre2, altura y tramo
    montoAproximado: orden.montoAproximado ?? '',
  }
}

// Props:
// - lugares: lista de lugares para el desplegable
// - errorLugares: true si no se pudieron cargar los lugares
// - ordenEditando: la OT a editar, o null si se está creando una nueva
// - onGuardado(texto, { sinSenal, programacion }): avisa si quedó en el celular o si se guardó solo una programación
// - onCancelar: se llama al cancelar la edición
// - lugarInicial: id del lugar con el que arranca una OT nueva ("+ Nueva OT acá" en la ficha del mapa); puede faltar
// - ubicacionDelMapa: { tramo, calleEntre1, calleEntre2 } si en el mapa se marcó un tramo de la calle; puede faltar
// - programarInicial: abre la opción periódica al llegar desde Mantenimiento
// - onVerProgramaciones: permite revisar las reglas si no se pudo confirmar un alta
function FormularioOrden({ lugares, errorLugares, ordenEditando, onGuardado, onCancelar, lugarInicial, ubicacionDelMapa, tipoInicial, programarInicial, onVerProgramaciones }) {
  const { usuario } = useSesion()
  const editando = ordenEditando != null
  const [datos, setDatos] = useState(() => {
    if (editando) return ordenAFormulario(ordenEditando)
    let inicial = lugarInicial != null ? { ...FORMULARIO_VACIO, lugarId: String(lugarInicial) } : FORMULARIO_VACIO
    // Tramo marcado en el mapa: arranca en "Tramo marcado" con las calles que lo limitan ya elegidas
    if (lugarInicial != null && ubicacionDelMapa?.tramo) inicial = { ...inicial, ...ubicacionInicial(ubicacionDelMapa) }
    // Desde la pestaña Luminarias del mapa, el tipo arranca en "Alumbrado" (se puede cambiar)
    return tipoInicial ? { ...inicial, tipo: tipoInicial } : inicial
  })
  const [errores, setErrores] = useState({}) // errores por campo: { descripcion: '...', tipo: '...' }
  const [error, setError] = useState(null)   // mensaje general, abajo del formulario
  const [guardando, setGuardando] = useState(false)
  const puedeProgramar = puedeGestionarMantenimiento(usuario) && !editando
  const [recurrencia, setRecurrencia] = useState(() => ({ ...recurrenciaInicial(), habilitada: Boolean(programarInicial && puedeProgramar) }))
  const repite = puedeProgramar && recurrencia.habilitada
  const [conConexion, setConConexion] = useState(() => navigator.onLine !== false)
  const [guardadoIncierto, setGuardadoIncierto] = useState(false)
  const envioEnCurso = useRef(false)

  useEffect(() => {
    function actualizarConexion() { setConConexion(navigator.onLine !== false) }
    window.addEventListener('online', actualizarConexion)
    window.addEventListener('offline', actualizarConexion)
    return () => {
      window.removeEventListener('online', actualizarConexion)
      window.removeEventListener('offline', actualizarConexion)
    }
  }, [])

  const sinLugares = !errorLugares && lugares.length === 0
  const lugarSeleccionado = lugares.find((lugar) => String(lugar.id) === String(datos.lugarId))
  const esLugarCalle = lugarSeleccionado?.tipo === 'CALLE'
  const modoUbicacion = esLugarCalle ? datos.modoUbicacion : 'NINGUNA'
  // Las esquinas de la calle elegida y las calles "lógicas" para "Entre calles" (utils/ubicacionEnCalle.js)
  const cruces = useMemo(() => crucesDeLaCalle(lugarSeleccionado, lugares), [lugarSeleccionado, lugares])
  const callesParaTramo = callesOfrecidas({
    calle: lugarSeleccionado, cruces, modo: modoUbicacion, tramo: datos.tramo, elegidas: [datos.calleEntre1, datos.calleEntre2],
  })
  const conTramo = modoUbicacion === MODOS_UBICACION.TRAMO && datos.tramo
  const tramoDeLasCalles = modoUbicacion === MODOS_UBICACION.ENTRE_CALLES && datos.calleEntre1 && datos.calleEntre2
    ? tramoEntre(lugarSeleccionado, cruces, datos.calleEntre1, datos.calleEntre2) : null

  // Al editar, o si ya viene el lugar elegido, el cursor arranca en la descripción
  useEffect(() => {
    if (editando || lugarInicial != null) document.getElementById('descripcion').focus({ preventScroll: true })
  }, [editando, lugarInicial])

  function cambiar(evento) {
    const { name, value } = evento.target
    setDatos((anterior) => {
      if (name === 'lugarId') return { ...anterior, ...SIN_UBICACION, lugarId: value }
      return { ...anterior, [name]: value }
    })
    // Si el campo tenía un error y el usuario lo está corrigiendo, lo sacamos
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  function cambiarRecurrencia(evento) {
    const { name, value, type, checked } = evento.target
    setRecurrencia((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }))
    setErrores((anteriores) => ({ ...anteriores, [name]: undefined }))
    setError(null)
  }

  // Revisa todos los campos y devuelve los errores encontrados ({} si está todo bien)
  function validar() {
    const encontrados = {}
    const descripcion = datos.descripcion.trim()
    if (descripcion === '') encontrados.descripcion = 'La descripción es obligatoria.'
    else if (descripcion.length > 500) encontrados.descripcion = 'La descripción no puede superar los 500 caracteres.'
    if (!datos.tipo) encontrados.tipo = 'Elegí el tipo de trabajo.'
    if (!repite && !datos.origen) encontrados.origen = 'Elegí de dónde surge la orden.'
    if (!datos.prioridad) encontrados.prioridad = 'Elegí la prioridad.'
    if (!datos.lugarId) encontrados.lugarId = 'Elegí el lugar donde se va a trabajar.'
    if (esLugarCalle) Object.assign(encontrados, validarUbicacion({ ...datos, modoUbicacion }, callesParaTramo))
    if (datos.montoAproximado !== '' && (!Number.isFinite(Number(datos.montoAproximado)) || Number(datos.montoAproximado) < 0)) {
      encontrados.montoAproximado = 'Ingresá un monto igual o mayor a cero.'
    }
    return repite ? { ...encontrados, ...validarProgramacion(datos, recurrencia) } : encontrados
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (envioEnCurso.current || guardadoIncierto) return
    if (repite && navigator.onLine === false) {
      setError('Necesitás conexión para guardar la programación. Tus datos siguen en el formulario.')
      return
    }

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
      // calleEntre1, calleEntre2, altura y tramo (siempre va el tramo: el PUT reemplaza todo)
      ...pedidoDeUbicacion({ calle: lugarSeleccionado, cruces, datos: { ...datos, modoUbicacion } }),
      montoAproximado: datos.montoAproximado === '' ? null : Number(datos.montoAproximado),
    }

    envioEnCurso.current = true
    setGuardando(true)
    setError(null)
    try {
      if (repite) {
        // Un único pedido: no crea además una OT común ni adelanta la ejecución del motor.
        const regla = await crearRegla(pedidoDeProgramacion(datos, recurrencia))
        setDatos(FORMULARIO_VACIO)
        setRecurrencia(recurrenciaInicial())
        onGuardado(`Se guardó la programación "${regla.titulo}". Primera fecha prevista: ${fechaProgramada(regla.proximaEjecucion)}. Las OT se generarán automáticamente cuando corresponda.`,
          { programacion: true })
      } else if (editando) {
        await actualizarOrden(ordenEditando.id, orden)
        onGuardado('Los cambios de la orden se guardaron correctamente.')
      } else {
        await registrar(orden)
      }
    } catch (e) {
      console.error(e)
      if (repite && clasificarError(e) === REINTENTAR) {
        // El POST de reglas no es idempotente. Si se perdió la respuesta, no se reenvía ni se encola.
        setGuardadoIncierto(true)
        setError('No pudimos confirmar si se guardó la programación. Revisá Mantenimiento periódico antes de intentar crearla nuevamente, para evitar duplicados. No se agregó a la cola sin conexión.')
        return
      }
      // Si el backend devolvió errores por campo (400), los mostramos debajo de cada campo
      // (la ventanilla de altas los nombra "orden.descripcion": nos quedamos con "descripcion")
      if (e.errores && Object.keys(e.errores).length > 0) {
        setErrores(Object.fromEntries(Object.entries(e.errores).map(([campo, texto]) => [campo.replace(/^orden\./, '').replace(/^tipoTrabajo$/, 'tipo'), texto])))
      }
      // 400, 404 y 409 traen un mensaje claro del backend (y "propio" marca los nuestros); para el resto, uno genérico
      setError([400, 404, 409].includes(e.estado) || e.propio
        ? e.message
        : 'No pudimos guardar la orden. Revisá la conexión e intentá nuevamente. Tus datos siguen en el formulario.')
    } finally {
      envioEnCurso.current = false
      setGuardando(false)
    }
  }

  // Una OT nueva se manda con su número de comanda (PUT /api/sincronizacion/altas-orden/{numero}).
  // Si se corta la señal, se anota en el cuaderno con ESE MISMO número: aunque el primer envío hubiera llegado,
  // el backend la reconoce y no la crea dos veces. Cuando vuelve la red, el cartero la manda sola.
  async function registrar(orden) {
    const lugar = lugares.find((opcion) => String(opcion.id) === String(orden.lugarId))
    const operacion = crearAltaOrden(usuario, orden, lugar?.nombre ?? '')
    try {
      if (navigator.onLine === false) throw new TypeError('Sin señal')
      await enviarOperacion(operacion)
      setDatos(FORMULARIO_VACIO)
      onGuardado('La orden de trabajo se registró correctamente.')
    } catch (e) {
      if (clasificarError(e) !== REINTENTAR) throw e
      try {
        await guardarOperacion(operacion)
      } catch {
        throw Object.assign(new Error('No hay señal y este navegador no permite guardar la orden. Tus datos siguen en el formulario.'),
          { propio: true })
      }
      setDatos(FORMULARIO_VACIO)
      onGuardado(`No hay señal: la orden "${orden.descripcion}" quedó guardada en este celular y se registra sola cuando vuelva la señal.`,
        { sinSenal: true })
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

      <fieldset className="formulario-cuerpo" disabled={guardando || guardadoIncierto}>
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
                  {lugares.filter((lugar) => lugar.instalada !== false).map((lugar) => ( // sin luminarias a futuro: no llevan OT
                    <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>
                  ))}
                </select>
                {mensajeCampo('lugarId', 'ayuda-lugar', 'El lugar del pueblo donde se va a realizar el trabajo.')}
              </div>

              {esLugarCalle && <div className="campo">
                <label htmlFor="modoUbicacion">Ubicación dentro de la calle</label>
                <select id="modoUbicacion" name="modoUbicacion" value={datos.modoUbicacion} onChange={cambiar}
                  {...accesibilidad(errores.tramo ? 'tramo' : 'modoUbicacion')}>
                  <option value="NINGUNA">Toda la calle</option>
                  {datos.tramo && <option value="TRAMO">Tramo marcado</option>}
                  <option value="ENTRE_CALLES">Entre calles</option>
                  <option value="ALTURA">Por altura</option>
                </select>
                {errores.tramo ? mensajeCampo('tramo') : mensajeCampo('modoUbicacion')}
              </div>}
              {/* Tramo marcado en el mapa (o el que ya tenía la OT): se muestra cuál es y se puede volver a toda la calle */}
              {esLugarCalle && conTramo && <div className="campo campo-ancho resumen-tramo" aria-live="polite">
                <p><Icono nombre="calle" /><span><strong>Tramo marcado:</strong> {textoTramo(lugarSeleccionado, cruces, datos.tramo)}</span></p>
                <button type="button" className="boton boton-secundario" onClick={() => setDatos((anterior) => ({ ...anterior, modoUbicacion: 'NINGUNA' }))}>
                  Usar toda la calle
                </button>
              </div>}
              {esLugarCalle && modoUbicacion === MODOS_UBICACION.ENTRE_CALLES && callesParaTramo.length === 0 && !errores.modoUbicacion && (
                <p className="mensaje mensaje-informacion campo-ancho">
                  {lugarSeleccionado.nombre} no cruza con ninguna calle cargada: usá "Por altura" o "Toda la calle".
                </p>
              )}
              {esLugarCalle && (modoUbicacion === MODOS_UBICACION.ENTRE_CALLES || conTramo) && callesParaTramo.length >= 2 && <>
                <div className="campo"><label htmlFor="calleEntre1">Entre calle {!conTramo && <span aria-hidden="true">*</span>}</label>
                  <select id="calleEntre1" name="calleEntre1" value={datos.calleEntre1} onChange={cambiar} {...accesibilidad('calleEntre1', 'ayuda-entre-calles')}>
                    <option value="">{conTramo ? 'Sin elegir' : 'Elegí una calle…'}</option>
                    {callesParaTramo.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
                  </select>
                  {mensajeCampo('calleEntre1', 'ayuda-entre-calles', conTramo
                    ? 'Solo las calles que limitan el tramo.'
                    : `Solo las calles que cruzan ${lugarSeleccionado.nombre}.`)}</div>
                <div className="campo"><label htmlFor="calleEntre2">Y calle {!conTramo && <span aria-hidden="true">*</span>}</label>
                  <select id="calleEntre2" name="calleEntre2" value={datos.calleEntre2} onChange={cambiar} {...accesibilidad('calleEntre2')}>
                    <option value="">{conTramo ? 'Sin elegir' : 'Elegí una calle…'}</option>
                    {callesParaTramo.filter((nombre) => nombre !== datos.calleEntre1).map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
                  </select>
                  {mensajeCampo('calleEntre2')}</div>
              </>}
              {tramoDeLasCalles && <p className="ayuda-campo campo-ancho" aria-live="polite">
                Tramo: {textoTramo(lugarSeleccionado, cruces, tramoDeLasCalles)}. Se dibuja en el mapa.
              </p>}
              {esLugarCalle && datos.modoUbicacion === 'ALTURA' && <div className="campo">
                <label htmlFor="altura">Altura <span aria-hidden="true">*</span></label>
                <input id="altura" name="altura" maxLength={20} value={datos.altura} onChange={cambiar} {...accesibilidad('altura')} />
                {mensajeCampo('altura')}</div>}
              <div className="campo">
                <label htmlFor="montoAproximado">Monto aproximado gastado</label>
                <div className="entrada-con-prefijo">
                  <span aria-hidden="true">$</span>
                  <input id="montoAproximado" name="montoAproximado" type="number" min="0" step="0.01"
                    value={datos.montoAproximado} onChange={cambiar} {...accesibilidad('montoAproximado')} />
                </div>
                {mensajeCampo('montoAproximado', null, 'Opcional. Se incluye en los reportes como estimación.')}
              </div>

              <div className="campo">
                <label htmlFor="origen">Origen <span aria-hidden="true">*</span></label>
                <select id="origen" name="origen" value={repite ? 'PLAN_MANTENIMIENTO' : datos.origen} onChange={cambiar} required disabled={repite}
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

        {puedeProgramar && <SeccionRecurrencia datos={recurrencia} errores={errores} onCambiar={cambiarRecurrencia} conConexion={conConexion} />}
        {editando && ordenEditando.reglaMantenimientoId != null && <p className="mensaje mensaje-informacion">
          Estás editando esta OT. La frecuencia y las próximas órdenes se gestionan desde Mantenimiento periódico.
        </p>}

        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      </fieldset>

      <div className="formulario-pie">
        <p className="ayuda-campo"><span aria-hidden="true">*</span> Campos obligatorios</p>
        <div className="botones">
          {guardadoIncierto && <button type="button" className="boton boton-secundario" onClick={onVerProgramaciones}>
            Revisar programaciones
          </button>}
          {editando && (
            <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>
              Cancelar edición
            </button>
          )}
          <button type="submit" className="boton boton-primario" disabled={guardando || sinLugares || guardadoIncierto || (repite && !conConexion)}>
            <Icono nombre="guardar" />
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : repite ? 'Guardar programación' : 'Registrar orden'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormularioOrden
