import { useEffect, useMemo, useState } from 'react'
import { listarOrdenes } from '../api/ordenesTrabajo'
import { listarEstados } from '../api/estadosOrden'
import { listarPuntos } from '../api/infraestructura'
import FiltrosOrdenes from '../components/FiltrosOrdenes'
import MapaLugares from '../components/MapaLugares'
import Icono from '../components/Icono'
import { FILTROS_ORDENES_VACIOS, filtrarOrdenes, rangoFechasValido } from '../utils/filtrosOrdenes'
import {
  COLORES_PRIORIDAD, COLOR_SIN_TRABAJOS, agruparPorLugar, colorDelResumen, geometriaEnLimites,
  geometriaValida, limitesDe, ordenarResumenes, ordenesAbiertas,
} from '../utils/mapa'
import { PRIORIDADES, TIPOS_TRABAJO, etiqueta } from '../utils/ordenesTrabajo'
import { etiquetaTipoLugar } from '../utils/lugares'
import '../estilos-mapa.css'

const PRIORIDADES_DE_MAYOR_A_MENOR = [...PRIORIDADES].reverse()

function PaginaMapa({ onNavegar }) {
  const [lugares, setLugares] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [estados, setEstados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_ORDENES_VACIOS)
  const [modoColor, setModoColor] = useState('prioridad') // 'prioridad' o 'estado' (RNF11)
  const [verSinTrabajos, setVerSinTrabajos] = useState(true)
  const [soloVisibles, setSoloVisibles] = useState(false)
  const [zonaVisible, setZonaVisible] = useState(null) // lo que se ve en el mapa en este momento
  const [lugarActivoId, setLugarActivoId] = useState(null) // el lugar resaltado en la lista
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
  const resumenesEnMapa = useMemo(
    () => (verSinTrabajos ? resumenes : resumenes.filter((resumen) => resumen.principal)),
    [resumenes, verSinTrabajos])
  const conTrabajos = useMemo(() => ordenarResumenes(resumenes.filter((resumen) => resumen.principal)), [resumenes])

  const enLista = soloVisibles && zonaVisible
    ? conTrabajos.filter((resumen) => geometriaEnLimites(resumen.lugar.ubicacion, zonaVisible))
    : conTrabajos
  const rangoValido = rangoFechasValido(filtros)
  const filtrosActivos = Object.values(filtros).filter((valor) => valor !== '').length
  const estadosAbiertos = estados.filter((estado) => !estado.cierre) // el mapa solo muestra trabajos abiertos

  function verEnMapa(lugarId) {
    setLugarActivoId(lugarId)
    setSeleccion((anterior) => ({ lugarId, vez: (anterior?.vez ?? 0) + 1 }))
    // En el celular el mapa queda arriba de la lista: lo traemos a la vista.
    document.getElementById('mapa-lugares')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    })
  }

  const verFicha = (lugarId) => onNavegar('ficha', { lugarId })
  const limpiarFiltros = () => setFiltros(FILTROS_ORDENES_VACIOS)

  let mensajeLista = null
  if (abiertas.length === 0) {
    mensajeLista = { titulo: 'No hay trabajos abiertos', texto: 'Cuando haya órdenes sin cerrar, los lugares donde hay que trabajar se van a marcar en el mapa.' }
  } else if (rangoValido && conTrabajos.length === 0) {
    mensajeLista = { titulo: 'Ninguna orden abierta coincide con los filtros', texto: 'Probá con otros criterios o limpiá los filtros.', limpiar: true }
  } else if (rangoValido && enLista.length === 0) {
    mensajeLista = { titulo: 'No hay trabajos en la zona que se ve', texto: 'Alejá el mapa para ver más lugares o desactivá la opción de mostrar solo lo visible.' }
  }

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">TRABAJOS DEL CORRALÓN</p>
        <h1>Mapa de lugares y trabajos</h1>
        <p>Mirá dónde hay trabajos abiertos. El color de cada lugar indica su prioridad o su estado; la lista que acompaña al mapa tiene los mismos datos escritos.</p>
      </div>

      <section className="panel listado" aria-labelledby="titulo-mapa" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-mapa">Trabajos abiertos en el mapa</h2>
            <p>Se muestran las órdenes que todavía no se cerraron.</p>
          </div>
          {!cargando && !error && (
            <span className="contador" role="status" aria-atomic="true">
              Mostrando {abiertasFiltradas.length} de {abiertas.length} {abiertas.length === 1 ? 'orden abierta' : 'órdenes abiertas'}
            </span>
          )}
        </div>

        {/* Plegados por defecto: en el celular, si no, el mapa queda muy abajo. */}
        <details className="filtros-plegables">
          <summary>
            Filtros
            {filtrosActivos > 0 && (
              <span className="filtros-activos">{filtrosActivos} {filtrosActivos === 1 ? 'filtro activo' : 'filtros activos'}</span>
            )}
          </summary>
          <FiltrosOrdenes filtros={filtros} lugares={lugares} estados={estadosAbiertos}
            onCambiar={setFiltros} onLimpiar={limpiarFiltros} />
        </details>

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={recargar}>
              Volver a cargar
            </button>
          </div>
        )}

        {cargando && (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando el mapa…</p>
          </div>
        )}

        {!cargando && !error && lugares.length === 0 && (
          <div className="estado-listado estado-vacio">
            <span className="icono-vacio"><Icono nombre="lugar" /></span>
            <h3>Todavía no hay lugares registrados</h3>
            <p>Registrá los lugares en Infraestructura para verlos acá.</p>
            <button type="button" className="boton boton-secundario" onClick={() => onNavegar('infraestructura')}>
              Ir a Infraestructura
            </button>
          </div>
        )}

        {!cargando && !error && lugares.length > 0 && (
          <div className="mapa-contenido">
            <div className="mapa-columna">
              <div className="mapa-controles">
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
                <label className="opcion-simple">
                  <input type="checkbox" checked={verSinTrabajos} onChange={(evento) => setVerSinTrabajos(evento.target.checked)} />
                  Mostrar lugares sin trabajos abiertos
                </label>
                <label className="opcion-simple">
                  <input type="checkbox" checked={soloVisibles} onChange={(evento) => setSoloVisibles(evento.target.checked)} />
                  La lista muestra solo lo que se ve en el mapa
                </label>
              </div>

              <MapaLugares resumenes={resumenesEnMapa} modoColor={modoColor} limites={limites} seleccion={seleccion}
                onSeleccionar={setLugarActivoId} onLimites={setZonaVisible} onVerFicha={verFicha} />

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
                  Sin trabajos abiertos
                </li>
              </ul>
              {modoColor === 'prioridad' && <p className="ayuda-tabla ayuda-mapa">Cuanto más urgente, más grande es la marca.</p>}
            </div>

            <div className="mapa-lista">
              <div className="mapa-lista-encabezado">
                <h3 id="titulo-lista-mapa">Lugares con trabajos</h3>
                <p role="status" aria-atomic="true">
                  {enLista.length} {enLista.length === 1 ? 'lugar' : 'lugares'}
                </p>
              </div>

              {mensajeLista ? (
                <div className="estado-listado estado-vacio">
                  <span className="icono-vacio"><Icono nombre="mapa" /></span>
                  <h3>{mensajeLista.titulo}</h3>
                  <p>{mensajeLista.texto}</p>
                  {mensajeLista.limpiar && (
                    <button type="button" className="boton boton-secundario" onClick={limpiarFiltros}>
                      Ver todas las órdenes abiertas
                    </button>
                  )}
                </div>
              ) : (
                <ul className="lista-lugares" aria-labelledby="titulo-lista-mapa">
                  {enLista.map((resumen) => (
                    <li key={resumen.lugar.id}
                      className={resumen.lugar.id === lugarActivoId ? 'lugar-item lugar-item-activo' : 'lugar-item'}>
                      <div className="lugar-item-cabecera">
                        <span className="lugar-color" style={{ background: colorDelResumen(resumen, modoColor) }} aria-hidden="true" />
                        <div>
                          <strong className="nombre-lugar">{resumen.lugar.nombre}</strong>
                          <span className="numero-orden">{etiquetaTipoLugar(resumen.lugar.tipo)}</span>
                        </div>
                      </div>
                      <ul className="lugar-ordenes">
                        {resumen.ordenes.map((orden) => (
                          <li key={orden.id}>
                            <span className="lugar-orden-texto">
                              <span className="numero-orden-inline">OT #{orden.id}</span> {orden.descripcion}
                            </span>
                            <span className="lugar-orden-chips">
                              <span className="tipo-lugar">{etiqueta(TIPOS_TRABAJO, orden.tipo)}</span>
                              <span className={`estado prioridad-${orden.prioridad.toLowerCase()}`}>
                                <span className="estado-punto" aria-hidden="true" />
                                {etiqueta(PRIORIDADES, orden.prioridad)}
                              </span>
                              {orden.estadoNombre && (
                                <span className="estado" style={{ color: orden.estadoColor, background: `${orden.estadoColor}1A` }}>
                                  <span className="estado-punto" aria-hidden="true" />
                                  {orden.estadoNombre}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="acciones">
                        <button type="button" className="boton boton-tabla" onClick={() => verEnMapa(resumen.lugar.id)}
                          aria-label={`Ver ${resumen.lugar.nombre} en el mapa`}>
                          <Icono nombre="lugar" />Ver en el mapa
                        </button>
                        <button type="button" className="boton boton-tabla" onClick={() => verFicha(resumen.lugar.id)}
                          aria-label={`Ver la ficha histórica de ${resumen.lugar.nombre}`}>
                          <Icono nombre="historial" />Ficha histórica
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  )
}

export default PaginaMapa
