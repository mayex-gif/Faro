import { useEffect, useRef, useState } from 'react'
import { cambiarEstadoOrden, listarOrdenes } from '../api/ordenesTrabajo'
import { listarPuntos } from '../api/infraestructura'
import { listarEstados } from '../api/estadosOrden'
import FormularioOrden from '../components/FormularioOrden'
import TablaOrdenes from '../components/TablaOrdenes'
import FiltrosOrdenes from '../components/FiltrosOrdenes'
import AvisoCambiosPendientes from '../components/AvisoCambiosPendientes'
import { FILTROS_ORDENES_VACIOS, filtrarOrdenes, rangoFechasValido } from '../utils/filtrosOrdenes'
import Icono from '../components/Icono'
import { useSesion } from '../context/useSesion'
import { puedeAsignar } from '../utils/permisos'
import { useColaCambios, useCuandoSeEnvian } from '../hooks/useColaCambios'
import { REINTENTAR, aplicarPendientes, clasificarError } from '../offline/datosCola'

// Lo último que se cargó con señal, por persona. Vive mientras FARO esté abierto (no se guarda en el celular):
// si se corta la señal, la lista y el desplegable de lugares siguen a la vista (y se puede cargar una OT sin señal).
const ultimaCarga = new Map()

function horaDe(fecha) {
  return fecha ? new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
}

// params.lugarId llega con "+ Nueva OT acá" (ficha del lugar en el mapa): el formulario arranca con ese lugar.
// params.desde === 'mapa': se muestra "Volver al mapa" para seguir donde estaba.
function PaginaOrdenes({ params, onNavegar }) {
  const { usuario } = useSesion()
  const puedeGestionar = puedeAsignar(usuario)
  const lugarInicial = params?.lugarId
  // Fijo mientras la pantalla está abierta (App la vuelve a armar si entra otra persona)
  const idUsuario = useRef(usuario.id)
  const recordada = ultimaCarga.get(usuario.id)
  const [ordenes, setOrdenes] = useState(() => recordada?.ordenes ?? [])
  const [cargadasA, setCargadasA] = useState(() => recordada?.hora ?? null)
  const [cargando, setCargando] = useState(() => !recordada?.ordenes)
  const [error, setError] = useState(null)
  // true si el último intento de traer las órdenes falló por falta de señal (se muestran las que ya estaban)
  const [sinSenal, setSinSenal] = useState(false)
  const [mensaje, setMensaje] = useState('')
  // La OT que se está editando, o null si el formulario está en modo "nueva"
  const [ordenEditando, setOrdenEditando] = useState(null)
  // Lugares para el desplegable del formulario
  const [lugares, setLugares] = useState(() => recordada?.lugares ?? [])
  const [errorLugares, setErrorLugares] = useState(false)
  // Estados posibles de una OT (Pendiente, En curso...) con los caminos permitidos entre ellos
  const [estados, setEstados] = useState(() => recordada?.estados ?? [])
  // Id de la OT que está cambiando de estado (para deshabilitar sus botones mientras tanto)
  const [idCambiandoEstado, setIdCambiandoEstado] = useState(null)
  const [errorAccion, setErrorAccion] = useState('')
  const [filtros, setFiltros] = useState(FILTROS_ORDENES_VACIOS)
  // El cuaderno: las OT cargadas sin señal que todavía no llegaron (o que hay que revisar)
  const { cola, pendientes, conflictos } = useColaCambios(usuario)

  // La lista incluye arriba las OT cargadas sin señal ("Nueva · Sin enviar", todavía sin número)
  const ordenesVistas = aplicarPendientes(ordenes, cola, estados)
  const ordenesFiltradas = filtrarOrdenes(ordenesVistas, filtros)
  const rangoValido = rangoFechasValido(filtros)

  function cargarOrdenes() {
    return listarOrdenes()
      .then((datos) => {
        setOrdenes(datos)
        setCargadasA(new Date().toISOString())
        setError(null)
        setSinSenal(false)
      })
      .catch((e) => {
        // Sin señal, pero con órdenes ya cargadas: se siguen mostrando (con un aviso) en vez de borrar la lista
        if (clasificarError(e) === REINTENTAR && ultimaCarga.get(idUsuario.current)?.ordenes) {
          setSinSenal(true)
          return
        }
        console.error(e)
        setError('No pudimos cargar las órdenes de trabajo. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargando(false))
  }

  function recargarOrdenes() {
    setCargando(true)
    cargarOrdenes()
  }

  // Al abrir la pantalla: traemos las OT y los lugares (ordenados alfabéticamente)
  useEffect(() => {
    cargarOrdenes()
    listarPuntos()
      .then((datos) => setLugares([...datos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))))
      .catch((e) => {
        if (clasificarError(e) === REINTENTAR && ultimaCarga.get(idUsuario.current)?.lugares?.length) return // se usan los que ya estaban
        console.error(e)
        setErrorLugares(true)
      })
    listarEstados()
      .then(setEstados)
      .catch((e) => console.error(e)) // sin estados, la tabla igual muestra el estado de cada OT
    // Cuando vuelve la señal se trae cómo están las órdenes ahora
    window.addEventListener('online', cargarOrdenes)
    return () => window.removeEventListener('online', cargarOrdenes)
  }, [])

  // Se recuerda lo cargado para usarlo si se corta la señal
  useEffect(() => {
    if (cargando || error) return
    ultimaCarga.set(usuario.id, { ordenes, lugares, estados, hora: cargadasA })
  }, [usuario.id, ordenes, lugares, estados, cargadasA, cargando, error])

  // Cuando una OT cargada sin señal llega al servidor, se trae la lista (ya con su número) y se avisa
  useCuandoSeEnvian({ pendientes, conflictos }, (enviadas) => {
    setMensaje(enviadas === 0 ? '' : `Volvió la señal: ${enviadas === 1 ? 'se registró 1 orden' : `se registraron ${enviadas} órdenes`} que habías cargado sin señal.`)
    cargarOrdenes()
  })

  // Botón "Editar" de la tabla
  function editar(orden) {
    if (!puedeGestionar) return
    setOrdenEditando(orden)
    setMensaje('')
    document.getElementById('formulario-orden').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  // Botones "Pasar a ..." de la tabla
  function cambiarEstado(orden, estadoNuevo) {
    if (!puedeGestionar) return
    // Finalizada y Cancelada no tienen vuelta atrás: pedimos confirmación
    if (estadoNuevo.cierre) {
      const confirmado = window.confirm(
        `¿Pasar la OT #${orden.id} a "${estadoNuevo.nombre}"? Después ya no se va a poder modificar.`)
      if (!confirmado) return
    }
    setIdCambiandoEstado(orden.id)
    setMensaje('')
    setErrorAccion('')
    cambiarEstadoOrden(orden.id, estadoNuevo.id)
      .then((actualizada) => {
        // reemplazamos solo esa OT en la lista, sin volver a pedir todas
        setOrdenes((anteriores) => anteriores.map((o) => (o.id === actualizada.id ? actualizada : o)))
        setMensaje(`La OT #${actualizada.id} pasó a "${actualizada.estadoNombre}".`)
        // si justo se estaba editando y quedó cerrada, salimos de la edición
        if (estadoNuevo.cierre && ordenEditando?.id === orden.id) setOrdenEditando(null)
      })
      .catch((e) => {
        console.error(e)
        // e.message trae el motivo que explica el backend (ej: "No se puede pasar una orden de ...")
        setErrorAccion(e.message || 'No se pudo cambiar el estado. Intentá nuevamente.')
      })
      .finally(() => setIdCambiandoEstado(null))
  }

  // Cuando el formulario guardó bien. Si quedó guardada sin señal, no se pide la lista (no hay red): ya se ve arriba.
  function alGuardar(texto, { sinSenal: quedoEnElCelular = false } = {}) {
    setOrdenEditando(null)
    setMensaje(texto)
    if (!quedoEnElCelular) recargarOrdenes()
  }

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">TRABAJOS DEL CORRALÓN</p>
        <h1>Órdenes de trabajo</h1>
        <p>Registrá los trabajos a realizar en cada lugar del pueblo: de dónde surgen, de qué tipo son, qué tan urgentes y en qué estado están.</p>
      </div>

      {params?.desde === 'mapa' && (
        <div className="mensaje mensaje-informacion aviso-desde-mapa">
          <p>
            Nueva orden para <strong>{lugares.find((lugar) => lugar.id === lugarInicial)?.nombre ?? 'el lugar elegido'}</strong>.
            Cuando la registres, podés volver al mapa.
          </p>
          <button type="button" className="boton boton-secundario" onClick={() => onNavegar('mapa', { lugarId: lugarInicial })}>
            <Icono nombre="volver" />Volver al mapa
          </button>
        </div>
      )}

      {/* La "key" reinicia el formulario cada vez que cambia la OT a editar */}
      <FormularioOrden
        key={ordenEditando?.id ?? 'nueva'}
        lugares={lugares}
        errorLugares={errorLugares}
        ordenEditando={ordenEditando}
        onGuardado={alGuardar}
        onCancelar={() => setOrdenEditando(null)}
        lugarInicial={lugarInicial}
      />

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
        {errorAccion && <p className="mensaje mensaje-error" role="alert">{errorAccion}</p>}
      </div>

      <AvisoCambiosPendientes cola={cola} />

      <section className="panel listado" aria-labelledby="titulo-listado-ordenes" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado-ordenes">Órdenes registradas</h2>
            <p>De la más reciente a la más antigua.</p>
          </div>
          {!cargando && !error && (
            <span className="contador" role="status" aria-atomic="true">
              Mostrando {ordenesFiltradas.length} de {ordenesVistas.length} {ordenesVistas.length === 1 ? 'orden' : 'órdenes'}
            </span>
          )}
        </div>

        <FiltrosOrdenes filtros={filtros} lugares={lugares} estados={estados} onCambiar={setFiltros}
          onLimpiar={() => setFiltros(FILTROS_ORDENES_VACIOS)} />

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargarOrdenes}>
              Volver a cargar
            </button>
          </div>
        )}

        {sinSenal && !error && !cargando && (
          <p className="mensaje mensaje-informacion" role="status">
            Sin señal: estás viendo las órdenes cargadas a las {horaDe(cargadasA)}. Las órdenes nuevas que registres quedan guardadas en este celular.
          </p>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando órdenes…</p>
          </div>
        ) : (
          <TablaOrdenes 
            ordenes={ordenesFiltradas} 
            idEditando={ordenEditando?.id}
            onEditar={puedeGestionar ? editar : undefined}
            errorCarga={Boolean(error) || !rangoValido}
            sinCoincidencias={ordenesVistas.length > 0}
            onLimpiarFiltros={() => setFiltros(FILTROS_ORDENES_VACIOS)}
            estados={estados} 
            onCambiarEstado={puedeGestionar ? cambiarEstado : undefined}
            idCambiandoEstado={idCambiandoEstado} 
          />
        )}
      </section>
    </>
  )
}

export default PaginaOrdenes
