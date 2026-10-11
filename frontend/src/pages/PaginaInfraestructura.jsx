import { useEffect, useState } from 'react'
import { eliminarPunto, listarPuntos } from '../api/infraestructura'
import FichaLugar from '../components/FichaLugar'
import FiltrosPuntos from '../components/FiltrosPuntos'
import FormularioPunto from '../components/FormularioPunto'
import TablaPuntos from '../components/TablaPuntos'
import Icono from '../components/Icono'
import { FILTROS_VACIOS, filtrarPuntos } from '../utils/filtros'

function PaginaInfraestructura() {
  const [puntos, setPuntos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState('')
  // El punto que se está editando, o null si el formulario está en modo "nuevo".
  const [puntoEditando, setPuntoEditando] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  // El lugar del que se está viendo la Ficha Histórica, o null si se muestra el listado.
  const [lugarHistoria, setLugarHistoria] = useState(null)

  // No es un estado: se calcula de nuevo cada vez que cambian los puntos o los filtros
  const puntosFiltrados = filtrarPuntos(puntos, filtros)

  function cargarPuntos() {
    return listarPuntos()
      .then((datos) => {
        setPuntos(datos)
        setError(null)
      })
      .catch((e) => {
        console.error(e)
        setError('No pudimos cargar los lugares. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargando(false))
  }

  // En el primer render ya estamos cargando; los eventos activan el indicador al recargar.
  function recargarPuntos() {
    setCargando(true)
    cargarPuntos()
  }

  useEffect(() => {
    cargarPuntos()
  }, [])

  function editar(punto) {
    setPuntoEditando(punto)
    setMensaje('')
    document.getElementById('formulario-punto').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  function alGuardar(texto) {
    setPuntoEditando(null)
    setMensaje(texto)
    recargarPuntos()
  }

  function verHistoria(punto) {
    setMensaje('')
    setLugarHistoria(punto)
  }

  // Al volver, el foco regresa al botón "Historia" de ese lugar, para seguir desde donde estaba
  function volverAlListado() {
    const id = lugarHistoria.id
    setLugarHistoria(null)
    requestAnimationFrame(() => document.getElementById(`historia-${id}`)?.focus())
  }

  async function eliminar(punto) {
    const confirmado = window.confirm(`¿Seguro que querés borrar "${punto.nombre}"? No se puede deshacer.`)
    if (!confirmado) return
    setMensaje('')
    try {
      await eliminarPunto(punto.id)
      if (puntoEditando?.id === punto.id) setPuntoEditando(null)
      setMensaje('El lugar se eliminó correctamente.')
      recargarPuntos()
    } catch (e) {
      console.error(e)
      // 409 = el backend explicó por qué no se puede (ej: el lugar tiene órdenes de trabajo)
      setError(e.estado === 409 ? e.message : 'No pudimos eliminar el lugar. Intentá nuevamente.')
    }
  }

  // Si se eligió un lugar, la pantalla muestra su ficha en lugar del listado.
  // El listado y los filtros quedan guardados: al volver, siguen como estaban.
  if (lugarHistoria) {
    return <FichaLugar key={lugarHistoria.id} lugar={lugarHistoria} onVolver={volverAlListado} />
  }

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">REGISTRO DE LUGARES</p>
        <h1>Puntos de infraestructura</h1>
        <p>Registrá y mantené actualizada la información de luminarias, espacios verdes y calles.</p>
      </div>

      <FormularioPunto
        key={puntoEditando?.id ?? 'nuevo'}
        puntoEditando={puntoEditando}
        onGuardado={alGuardar}
        onCancelar={() => setPuntoEditando(null)}
      />

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
      </div>

      <section className="panel listado" aria-labelledby="titulo-listado" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado">Lugares registrados</h2>
            <p>Consultá los datos y el estado operativo de cada lugar.</p>
          </div>
          {!cargando && !error && (
            <span className="contador">Mostrando {puntosFiltrados.length} de {puntos.length} puntos</span>
          )}
        </div>

        <FiltrosPuntos
          filtros={filtros}
          onCambiar={setFiltros}
          onLimpiar={() => setFiltros(FILTROS_VACIOS)}
        />

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargarPuntos}>
              Volver a cargar
            </button>
          </div>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando lugares…</p>
          </div>
        ) : (
          <TablaPuntos puntos={puntosFiltrados} idEditando={puntoEditando?.id}
            onEditar={editar} onVerHistoria={verHistoria} onEliminar={eliminar} errorCarga={Boolean(error)}
            mensajeVacio={puntos.length === 0 ? 'Todavía no hay puntos cargados.' : 'Ningún punto coincide con los filtros.'}
          />
        )}
      </section>
    </>
  )
}

export default PaginaInfraestructura