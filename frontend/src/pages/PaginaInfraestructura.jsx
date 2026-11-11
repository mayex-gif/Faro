import { useEffect, useState } from 'react'
import { eliminarPunto, listarPuntos } from '../api/infraestructura'
import FiltrosPuntos from '../components/FiltrosPuntos'
import FormularioPunto from '../components/FormularioPunto'
import TablaPuntos from '../components/TablaPuntos'
import Icono from '../components/Icono'
import { FILTROS_VACIOS, filtrarPuntos } from '../utils/filtros'
import { lugaresDeCategoria, tiposDeCategoria } from '../utils/lugares'
import '../estilos-luminarias.css'

// Textos de cada categoría. La misma pantalla sirve para las dos:
// - "infraestructura" (Más → Infraestructura): espacios verdes y calles
// - "luminarias" (Más → Luminarias): el alumbrado público, aparte (pedido del municipio)
const TEXTOS = {
  infraestructura: {
    sobreTitulo: 'REGISTRO DE LUGARES', titulo: 'Puntos de infraestructura',
    bajada: 'Registrá y mantené actualizada la información de los espacios verdes y las calles. Las luminarias tienen su propia sección: Más → Luminarias.',
    listado: 'Lugares registrados', ayudaListado: 'Consultá los datos y el estado operativo de cada lugar.',
    contador: 'puntos', vacio: 'Todavía no hay espacios verdes ni calles cargados.', cargando: 'Cargando lugares…',
  },
  luminarias: {
    sobreTitulo: 'ALUMBRADO PÚBLICO', titulo: 'Luminarias',
    bajada: 'Registrá las luminarias del pueblo, si funcionan y cuáles faltan poner. Para ver cómo está el alumbrado, entrá al Mapa → pestaña Luminarias.',
    listado: 'Luminarias registradas', ayudaListado: 'Consultá los datos y el estado de cada luminaria.',
    contador: 'luminarias', vacio: 'Todavía no hay luminarias cargadas.', cargando: 'Cargando luminarias…',
  },
}

function PaginaInfraestructura({ onNavegar, categoria = 'infraestructura' }) {
  const textos = TEXTOS[categoria] ?? TEXTOS.infraestructura
  const tipos = tiposDeCategoria(categoria)
  const [puntos, setPuntos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState('')
  // El punto que se está editando, o null si el formulario está en modo "nuevo".
  const [puntoEditando, setPuntoEditando] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)

  // No es un estado: se calcula de nuevo cada vez que cambian los puntos o los filtros
  // Solo los lugares de esta pantalla (Infraestructura: espacios verdes y calles; Luminarias: luminarias)
  const deLaCategoria = lugaresDeCategoria(puntos, categoria)
  const puntosFiltrados = filtrarPuntos(deLaCategoria, filtros)
  const esLuminarias = categoria === 'luminarias'

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

  async function eliminar(punto) {
    const confirmado = window.confirm(`¿Seguro que querés borrar "${punto.nombre}"? No se puede deshacer.`)
    if (!confirmado) return
    setMensaje('')
    try {
      await eliminarPunto(punto.id)
      if (puntoEditando?.id === punto.id) setPuntoEditando(null)
      setMensaje(esLuminarias ? 'La luminaria se eliminó correctamente.' : 'El lugar se eliminó correctamente.')
      recargarPuntos()
    } catch (e) {
      console.error(e)
      // 409 = el backend explicó por qué no se puede (ej: el lugar tiene órdenes de trabajo)
      setError(e.estado === 409 ? e.message : 'No pudimos eliminar el lugar. Intentá nuevamente.')
    }
  }

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">{textos.sobreTitulo}</p>
        <h1>{textos.titulo}</h1>
        <p>{textos.bajada}</p>
      </div>

      <FormularioPunto
        key={puntoEditando?.id ?? 'nuevo'}
        puntoEditando={puntoEditando}
        tipos={tipos}
        onGuardado={alGuardar}
        onCancelar={() => setPuntoEditando(null)}
      />

      <div className="notificaciones" aria-live="polite" aria-atomic="true">
        {mensaje && <p className="mensaje mensaje-exito"><Icono nombre="guardar" />{mensaje}</p>}
      </div>

      <section className="panel listado" aria-labelledby="titulo-listado" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado">{textos.listado}</h2>
            <p>{textos.ayudaListado}</p>
          </div>
          {!cargando && !error && (
            <span className="contador">Mostrando {puntosFiltrados.length} de {deLaCategoria.length} {textos.contador}</span>
          )}
        </div>

        <FiltrosPuntos
          filtros={filtros}
          tipos={tipos}
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
            <p>{textos.cargando}</p>
          </div>
        ) : (
          <TablaPuntos puntos={puntosFiltrados} idEditando={puntoEditando?.id}
            onEditar={editar} onEliminar={eliminar} errorCarga={Boolean(error)} mostrarTipo={tipos.length > 1}
            onVerFicha={(punto) => onNavegar('ficha', { lugarId: punto.id })}
            mensajeVacio={deLaCategoria.length === 0 ? textos.vacio : 'Ningún resultado coincide con los filtros.'}
          />
        )}
      </section>
    </>
  )
}

export default PaginaInfraestructura