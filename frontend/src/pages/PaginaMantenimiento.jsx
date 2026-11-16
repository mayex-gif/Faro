
import { useEffect, useState } from 'react'
import {
  activarRegla, desviosDeRegla, desviosGlobales, eliminarRegla, ejecutarRegla, listarReglas, pausarRegla,
} from '../api/mantenimiento'
import { listarPuntos } from '../api/infraestructura'
import { listarCuadrillas } from '../api/cuadrillas'
import FormularioRegla from '../components/FormularioRegla'
import TablaReglas from '../components/TablaReglas'
import PanelDesvios from '../components/PanelDesvios'
import Icono from '../components/Icono'
import { useSesion } from '../context/useSesion'
import { puedeGestionarMantenimiento } from '../utils/permisos'
import { filtrarReglas } from '../utils/mantenimiento'
import '../estilos-mantenimiento.css'

const FILTROS_INICIALES = { texto: '', estado: 'todas' }

// Motor de mantenimiento periódico: reglas de recurrencia que generan Órdenes de Trabajo solas
// (RF08, backend en ReglaMantenimientoController). La ve y gestiona el encargado del corralón
// (utils/permisos.js); el backend valida lo mismo (403 para otros roles en las acciones de escritura).
function PaginaMantenimiento({ onNavegar }) {
  const { usuario } = useSesion()
  const puedeGestionar = puedeGestionarMantenimiento(usuario)
  const [reglas, setReglas] = useState([])
  const [lugares, setLugares] = useState([])
  const [cuadrillas, setCuadrillas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [editando, setEditando] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [ocupadaId, setOcupadaId] = useState(null)
  const [errorAccion, setErrorAccion] = useState('')
  // Desvíos que se están mostrando: { tipo: 'regla' | 'global', regla, resumen, cargando, error } o null
  const [desvios, setDesvios] = useState(null)

  const visibles = filtrarReglas(reglas, filtros)

  function cargar() {
    return Promise.all([listarReglas(), listarPuntos(), listarCuadrillas()])
      .then(([listaReglas, listaLugares, listaCuadrillas]) => {
        setReglas(listaReglas)
        setLugares([...listaLugares].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
        setCuadrillas(listaCuadrillas)
        setError(null)
      })
      .catch((e) => {
        console.error(e)
        setError('No pudimos cargar el mantenimiento periódico. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargando(false))
  }

  function recargar() {
    setCargando(true)
    cargar()
  }

  useEffect(() => {
    cargar()
  }, [])

  function irA(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  function editar(regla) {
    setEditando(regla)
    setMensaje('')
    window.scrollTo(0, 0)
  }

  function alGuardar(texto) {
    setEditando(null)
    setMensaje(texto)
    recargar()
  }

  async function ejecutarAccion(regla, promesa, textoExito) {
    setOcupadaId(regla.id)
    setErrorAccion('')
    try {
      await promesa()
      setMensaje(textoExito)
      recargar()
    } catch (e) {
      console.error(e)
      setErrorAccion([400, 404, 409].includes(e.estado) ? e.message : 'No pudimos completar la operación. Intentá nuevamente.')
    } finally {
      setOcupadaId(null)
    }
  }

  function ejecutarYa(regla) {
    setMensaje('')
    ejecutarAccion(regla, () => ejecutarRegla(regla.id), `Se generó la próxima OT de "${regla.titulo}".`)
  }

  function pausar(regla) {
    setMensaje('')
    ejecutarAccion(regla, () => pausarRegla(regla.id), `Se pausó "${regla.titulo}": no va a generar OT nuevas hasta que se reactive.`)
  }

  function activar(regla) {
    setMensaje('')
    ejecutarAccion(regla, () => activarRegla(regla.id), `Se reactivó "${regla.titulo}".`)
  }

  function borrar(regla) {
    if (!window.confirm(`¿Borrar la regla "${regla.titulo}"? Esta acción no se puede deshacer.`)) return
    setMensaje('')
    ejecutarAccion(regla, () => eliminarRegla(regla.id), `Se borró la regla "${regla.titulo}".`)
  }

  function verDesviosDeRegla(regla) {
    setDesvios({ tipo: 'regla', regla, resumen: null, cargando: true, error: null })
    irA('panel-desvios')
    desviosDeRegla(regla.id)
      .then((resumen) => setDesvios({ tipo: 'regla', regla, resumen, cargando: false, error: null }))
      .catch((e) => {
        console.error(e)
        setDesvios({ tipo: 'regla', regla, resumen: null, cargando: false, error: 'No pudimos calcular los desvíos. Intentá nuevamente.' })
      })
  }

  function verDesviosGlobales() {
    setDesvios({ tipo: 'global', regla: null, resumen: null, cargando: true, error: null })
    irA('panel-desvios')
    desviosGlobales()
      .then((resumen) => setDesvios({ tipo: 'global', regla: null, resumen, cargando: false, error: null }))
      .catch((e) => {
        console.error(e)
        setDesvios({ tipo: 'global', regla: null, resumen: null, cargando: false, error: 'No pudimos calcular los desvíos. Intentá nuevamente.' })
      })
  }

  const mensajeVacio = reglas.length === 0 ? 'Todavía no hay reglas de mantenimiento periódico cargadas.' : 'Ninguna regla coincide con la búsqueda.'

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">PLANIFICACIÓN</p>
        <h1>Mantenimiento periódico</h1>
        <p>Consultá las programaciones, ajustá sus datos y revisá el cumplimiento de los trabajos periódicos.</p>
        {puedeGestionar && <button type="button" className="boton boton-primario acceso-programaciones"
          onClick={() => onNavegar('ordenes', { programar: true })}><Icono nombre="agregar" />Programar desde Trabajos</button>}
      </div>

      {puedeGestionar && editando && (
        <FormularioRegla key={editando.id} reglaEditando={editando} lugares={lugares} cuadrillas={cuadrillas}
          onGuardado={alGuardar} onCancelar={() => setEditando(null)} />
      )}

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
        {errorAccion && <p className="mensaje mensaje-error" role="alert">{errorAccion}</p>}
      </div>

      <section className="panel listado" aria-labelledby="titulo-listado-reglas" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado-reglas">Reglas configuradas</h2>
            <p>Pausar una regla no borra lo ya generado: solo deja de crear OT nuevas.</p>
          </div>
          <div className="acciones-encabezado-reglas">
            {!cargando && !error && <span className="contador">Mostrando {visibles.length} de {reglas.length}</span>}
            <button type="button" className="boton boton-secundario" onClick={verDesviosGlobales}>
              <Icono nombre="historial" />Desvíos globales
            </button>
          </div>
        </div>

        <section className="bloque-filtros" aria-label="Buscar y filtrar reglas">
          <div className="filtros filtros-reglas">
            <div className="campo filtro-busqueda">
              <label htmlFor="filtro-regla-texto">Buscar</label>
              <input id="filtro-regla-texto" type="search" value={filtros.texto} placeholder="Título, descripción o lugar"
                onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="filtro-regla-estado">Mostrar</label>
              <select id="filtro-regla-estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
                <option value="todas">Todas</option>
                <option value="activas">Activas</option>
                <option value="pausadas">Pausadas</option>
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargar}>Volver a cargar</button>
          </div>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando reglas…</p>
          </div>
        ) : !error && (
          <TablaReglas reglas={visibles} idEditando={editando?.id} ocupado={Boolean(ocupadaId)} mensajeVacio={mensajeVacio}
            onEditar={puedeGestionar ? editar : () => {}}
            onEjecutar={puedeGestionar ? ejecutarYa : () => {}}
            onPausar={puedeGestionar ? pausar : () => {}}
            onActivar={puedeGestionar ? activar : () => {}}
            onBorrar={puedeGestionar ? borrar : () => {}}
            onVerDesvios={verDesviosDeRegla} />
        )}
      </section>

      {desvios && (
        <div id="panel-desvios" style={{ marginTop: 24 }}>
          <PanelDesvios resumen={desvios.resumen} cargando={desvios.cargando} error={desvios.error}
            titulo={desvios.tipo === 'global' ? 'Desvíos: consolidado municipal' : `Desvíos: ${desvios.regla.titulo}`}
            onCerrar={() => setDesvios(null)}
            onReintentar={desvios.tipo === 'global' ? verDesviosGlobales : () => verDesviosDeRegla(desvios.regla)} />
        </div>
      )}
    </>
  )
}

export default PaginaMantenimiento
