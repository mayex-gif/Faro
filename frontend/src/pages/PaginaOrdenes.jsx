import { useEffect, useState } from 'react'
import { listarOrdenes } from '../api/ordenesTrabajo'
import { listarPuntos } from '../api/infraestructura'
import FormularioOrden from '../components/FormularioOrden'
import TablaOrdenes from '../components/TablaOrdenes'
import FiltrosOrdenes from '../components/FiltrosOrdenes'
import { FILTROS_ORDENES_VACIOS, filtrarOrdenes, rangoFechasValido } from '../utils/filtrosOrdenes'
import Icono from '../components/Icono'

function PaginaOrdenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState('')
  // La OT que se está editando, o null si el formulario está en modo "nueva"
  const [ordenEditando, setOrdenEditando] = useState(null)
  // Lugares para el desplegable del formulario
  const [lugares, setLugares] = useState([])
  const [errorLugares, setErrorLugares] = useState(false)
  const [filtros, setFiltros] = useState(FILTROS_ORDENES_VACIOS)

  const ordenesFiltradas = filtrarOrdenes(ordenes, filtros)
  const rangoValido = rangoFechasValido(filtros)

  function cargarOrdenes() {
    return listarOrdenes()
      .then((datos) => {
        setOrdenes(datos)
        setError(null)
      })
      .catch((e) => {
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
        console.error(e)
        setErrorLugares(true)
      })
  }, [])

  // Botón "Editar" de la tabla
  function editar(orden) {
    setOrdenEditando(orden)
    setMensaje('')
    document.getElementById('formulario-orden').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  // Cuando el formulario guardó bien
  function alGuardar(texto) {
    setOrdenEditando(null)
    setMensaje(texto)
    recargarOrdenes()
  }

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">TRABAJOS DEL CORRALÓN</p>
        <h1>Órdenes de trabajo</h1>
        <p>Registrá los trabajos a realizar en cada lugar del pueblo: de dónde surgen, de qué tipo son y qué tan urgentes.</p>
      </div>

      {/* La "key" reinicia el formulario cada vez que cambia la OT a editar */}
      <FormularioOrden
        key={ordenEditando?.id ?? 'nueva'}
        lugares={lugares}
        errorLugares={errorLugares}
        ordenEditando={ordenEditando}
        onGuardado={alGuardar}
        onCancelar={() => setOrdenEditando(null)}
      />

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
      </div>

      <section className="panel listado" aria-labelledby="titulo-listado-ordenes" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado-ordenes">Órdenes registradas</h2>
            <p>De la más reciente a la más antigua.</p>
          </div>
          {!cargando && !error && (
            <span className="contador" role="status" aria-atomic="true">
              Mostrando {ordenesFiltradas.length} de {ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'}
            </span>
          )}
        </div>

        <FiltrosOrdenes filtros={filtros} lugares={lugares} onCambiar={setFiltros}
          onLimpiar={() => setFiltros(FILTROS_ORDENES_VACIOS)} />

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargarOrdenes}>
              Volver a cargar
            </button>
          </div>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando órdenes…</p>
          </div>
        ) : (
          <TablaOrdenes ordenes={ordenesFiltradas} idEditando={ordenEditando?.id}
            onEditar={editar} errorCarga={Boolean(error) || !rangoValido}
            sinCoincidencias={ordenes.length > 0}
            onLimpiarFiltros={() => setFiltros(FILTROS_ORDENES_VACIOS)} />
        )}
      </section>
    </>
  )
}

export default PaginaOrdenes
