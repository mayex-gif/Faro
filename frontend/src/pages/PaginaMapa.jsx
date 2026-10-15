import { useEffect, useMemo, useState } from 'react'
import { listarOrdenes } from '../api/ordenesTrabajo'
import { listarEstados } from '../api/estadosOrden'
import { listarPuntos } from '../api/infraestructura'
import FiltrosOrdenes from '../components/FiltrosOrdenes'
import ListaLugares from '../components/ListaLugares'
import MapaLugares from '../components/MapaLugares'
import PanelLugar from '../components/PanelLugar'
import { FILTROS_ORDENES_VACIOS, filtrarOrdenes } from '../utils/filtrosOrdenes'
import { FILTROS_LUGARES_VACIOS, filtrarLugares } from '../utils/listaLugares'
import {
  COLORES_PRIORIDAD, COLOR_SIN_TRABAJOS, agruparPorLugar, geometriaEnLimites,
  geometriaValida, limitesDe, ordenarResumenes, ordenesAbiertas,
} from '../utils/mapa'
import { PRIORIDADES } from '../utils/ordenesTrabajo'
import '../estilos-mapa.css'
import '../estilos-mapa-primero.css'

const PRIORIDADES_DE_MAYOR_A_MENOR = [...PRIORIDADES].reverse()

// Pantalla principal de FARO (propuesta A "El mapa primero"), en tres columnas:
// a la izquierda la lista de lugares con sus filtros, en el centro el mapa y, a la derecha,
// la ficha del lugar elegido. La lista y el mapa muestran los mismos lugares.
function PaginaMapa({ onNavegar }) {
  const [lugares, setLugares] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [estados, setEstados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtrosLugares, setFiltrosLugares] = useState(FILTROS_LUGARES_VACIOS) // los botoncitos
  const [filtros, setFiltros] = useState(FILTROS_ORDENES_VACIOS) // "Más filtros" (de las órdenes)
  const [modoColor, setModoColor] = useState('prioridad') // 'prioridad' o 'estado' (RNF11)
  const [soloVisibles, setSoloVisibles] = useState(false)
  const [zonaVisible, setZonaVisible] = useState(null) // lo que se ve en el mapa en este momento
  const [lugarActivoId, setLugarActivoId] = useState(null) // el lugar elegido: su ficha se ve a la derecha
  const [seleccion, setSeleccion] = useState(null) // pedido de "ir a este lugar" para el mapa

  function cargarDatos() {
    // Sin los tres no se puede armar el mapa: si falla uno, es un error de carga.
    return Promise.all([listarPuntos(), listarOrdenes(), listarEstados()])
      .then(([datosLugares, datosOrdenes, datosEstados]) => {
        setLugares([...datosLugares].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
        setOrdenes(datosOrdenes)
        setEstados(datosEstados)
        setError(null)
      })
      .catch((e) => {
        console.error(e)
        setError('No pudimos cargar el mapa. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => setCargando(false))
  }

  function recargar() {
    setCargando(true)
    cargarDatos()
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Se recalcula solo cuando cambian los datos o los filtros: el mapa redibuja solo si cambian estas listas.
  const abiertas = useMemo(() => ordenesAbiertas(ordenes, estados), [ordenes, estados])
  const abiertasFiltradas = useMemo(() => filtrarOrdenes(abiertas, filtros), [abiertas, filtros])
  const lugaresConUbicacion = useMemo(() => lugares.filter((lugar) => geometriaValida(lugar.ubicacion)), [lugares])
  const limites = useMemo(() => limitesDe(lugaresConUbicacion), [lugaresConUbicacion])
  const resumenes = useMemo(() => agruparPorLugar(lugaresConUbicacion, abiertasFiltradas), [lugaresConUbicacion, abiertasFiltradas])
  const enMapa = useMemo(() => filtrarLugares(resumenes, filtrosLugares), [resumenes, filtrosLugares])
  // La ficha muestra todos los trabajos abiertos del lugar, aunque "Más filtros" esconda algunos.
  const resumenesCompletos = useMemo(() => agruparPorLugar(lugaresConUbicacion, abiertas), [lugaresConUbicacion, abiertas])

  const ordenados = ordenarResumenes(enMapa)
  const enLista = soloVisibles && zonaVisible
    ? ordenados.filter((resumen) => geometriaEnLimites(resumen.lugar.ubicacion, zonaVisible))
    : ordenados
  const resumenActivo = resumenesCompletos.find((resumen) => resumen.lugar.id === lugarActivoId) ?? null
  const filtrosActivos = Object.values(filtros).filter((valor) => valor !== '').length + (soloVisibles ? 1 : 0)
  const estadosAbiertos = estados.filter((estado) => !estado.cierre) // el mapa solo muestra trabajos abiertos

  // Elegido desde la lista: además de abrir la ficha, el mapa va hacia el lugar.
  function elegirDesdeLista(lugarId) {
    setLugarActivoId(lugarId)
    setSeleccion((anterior) => ({ lugarId, vez: (anterior?.vez ?? 0) + 1 }))
    // En pantallas angostas el mapa queda debajo de la lista: lo traemos a la vista (la ficha sigue debajo).
    if (window.matchMedia('(max-width: 1050px)').matches) {
      document.getElementById('mapa-lugares')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    }
  }

  const verHistoria = (lugarId) => onNavegar('ficha', { lugarId })

  function verTodos() {
    setFiltrosLugares(FILTROS_LUGARES_VACIOS)
    setFiltros(FILTROS_ORDENES_VACIOS)
    setSoloVisibles(false)
  }

  let mensajeVacio
  if (lugares.length === 0) {
    mensajeVacio = {
      titulo: 'Todavía no hay lugares registrados',
      texto: 'Registralos en Infraestructura para verlos en el mapa.',
      accion: { texto: 'Ir a Infraestructura', alHacer: () => onNavegar('infraestructura') },
    }
  } else if (resumenes.length === 0) {
    mensajeVacio = { titulo: 'Ningún lugar tiene una ubicación válida', texto: 'Revisá las coordenadas en Infraestructura.' }
  } else if (enMapa.length === 0) {
    mensajeVacio = {
      titulo: 'Ningún lugar coincide con los filtros',
      texto: 'Probá apagando algún botoncito o limpiando "Más filtros".',
      accion: { texto: 'Ver todos los lugares', alHacer: verTodos },
    }
  } else {
    mensajeVacio = { titulo: 'No hay lugares en la zona que se ve', texto: 'Alejá el mapa para ver más lugares.' }
  }

  return (
    <div className={resumenActivo ? 'pantalla-mapa pantalla-mapa-con-ficha' : 'pantalla-mapa'}>
      {cargando || error ? (
        <section className="columna-lugares" aria-labelledby="titulo-lugares" aria-busy={cargando}>
          <div className="lugares-encabezado">
            <div className="lugares-titulo"><h1 id="titulo-lugares">Lugares</h1></div>
          </div>
          {cargando && (
            <div className="estado-listado" role="status">
              <span className="indicador-carga" aria-hidden="true" />
              <p>Cargando los lugares…</p>
            </div>
          )}
          {error && (
            <div className="mensaje mensaje-error" role="alert">
              <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
              <button type="button" className="boton boton-secundario" onClick={recargar}>Volver a cargar</button>
            </div>
          )}
        </section>
      ) : (
        <ListaLugares resumenes={enLista} total={resumenes.length}
          filtros={filtrosLugares} onCambiarFiltros={setFiltrosLugares}
          lugarActivoId={lugarActivoId} onElegir={elegirDesdeLista} mensajeVacio={mensajeVacio}>
          {/* Los filtros de órdenes de siempre, plegados para que no tapen la lista */}
          <details className="mas-filtros">
            <summary>
              Más filtros
              {filtrosActivos > 0 && (
                <span className="filtros-activos">{filtrosActivos} {filtrosActivos === 1 ? 'activo' : 'activos'}</span>
              )}
            </summary>
            <FiltrosOrdenes filtros={filtros} lugares={lugares} estados={estadosAbiertos}
              onCambiar={setFiltros} onLimpiar={() => setFiltros(FILTROS_ORDENES_VACIOS)} />
            <label className="opcion-simple">
              <input type="checkbox" checked={soloVisibles} onChange={(evento) => setSoloVisibles(evento.target.checked)} />
              La lista muestra solo lo que se ve en el mapa
            </label>
          </details>
        </ListaLugares>
      )}

      <section className="columna-mapa" aria-label="Mapa de Estación General Paz">
        <MapaLugares resumenes={enMapa} modoColor={modoColor} limites={limites} seleccion={seleccion}
          onSeleccionar={setLugarActivoId} onLimites={setZonaVisible} />

        {/* Leyenda sobre el mapa: qué significa cada color y, si se quiere, colorear por estado */}
        <div className="leyenda-flotante">
          <fieldset className="opciones-radio">
            <legend>Colorear por</legend>
            <label>
              <input type="radio" name="modo-color" value="prioridad" checked={modoColor === 'prioridad'}
                onChange={() => setModoColor('prioridad')} />
              Prioridad
            </label>
            <label>
              <input type="radio" name="modo-color" value="estado" checked={modoColor === 'estado'}
                onChange={() => setModoColor('estado')} />
              Estado
            </label>
          </fieldset>
          <ul className="leyenda" aria-label="Significado de los colores del mapa">
            {modoColor === 'prioridad'
              ? PRIORIDADES_DE_MAYOR_A_MENOR.map((prioridad) => (
                <li key={prioridad.valor}>
                  <span className="leyenda-color" style={{ background: COLORES_PRIORIDAD[prioridad.valor] }} aria-hidden="true" />
                  {prioridad.etiqueta}
                </li>
              ))
              : estadosAbiertos.map((estado) => (
                <li key={estado.id}>
                  <span className="leyenda-color" style={{ background: estado.color }} aria-hidden="true" />
                  {estado.nombre}
                </li>
              ))}
            <li>
              <span className="leyenda-color" style={{ background: COLOR_SIN_TRABAJOS }} aria-hidden="true" />
              Sin trabajos
            </li>
          </ul>
          {modoColor === 'prioridad' && <p className="leyenda-ayuda">Cuanto más urgente, más grande es la marca.</p>}
        </div>
      </section>

      {/* key: al elegir otro lugar, el panel arranca de cero (se vuelve a pedir su historia) */}
      {resumenActivo && (
        <PanelLugar key={resumenActivo.lugar.id} resumen={resumenActivo}
          onCerrar={() => setLugarActivoId(null)} onVerHistoria={verHistoria} />
      )}
    </div>
  )
}

export default PaginaMapa
