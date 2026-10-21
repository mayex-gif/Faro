import { useEffect, useMemo, useRef, useState } from 'react'
import { listarOrdenes } from '../api/ordenesTrabajo'
import { listarEstados } from '../api/estadosOrden'
import { listarPuntos } from '../api/infraestructura'
import { listarCuadrillas } from '../api/cuadrillas'
import BotoncitosLugares from '../components/BotoncitosLugares'
import FiltrosOrdenes from '../components/FiltrosOrdenes'
import FormularioLugarMapa from '../components/FormularioLugarMapa'
import Icono from '../components/Icono'
import ListaLugares from '../components/ListaLugares'
import MapaLugares from '../components/MapaLugares'
import PanelLugar from '../components/PanelLugar'
import TarjetaLugar from '../components/TarjetaLugar'
import usePantallaAngosta from '../hooks/usePantallaAngosta'
import { FILTROS_ORDENES_VACIOS, filtrarOrdenes } from '../utils/filtrosOrdenes'
import { FILTROS_LUGARES_VACIOS, filtrarLugares } from '../utils/listaLugares'
import {
  COLORES_PRIORIDAD, COLOR_SIN_TRABAJOS, agruparPorLugar, geometriaEnLimites,
  limitesDe, ordenarResumenes, ordenesAbiertas,
} from '../utils/mapa'
import { PRIORIDADES } from '../utils/ordenesTrabajo'
import { separarPorZona } from '../utils/zona'
import { useSesion } from '../context/useSesion'
import { puedeAgregarLugar, puedeVer } from '../utils/permisos'
import '../estilos-mapa.css'
import '../estilos-mapa-primero.css'

const PRIORIDADES_DE_MAYOR_A_MENOR = [...PRIORIDADES].reverse()

// Pantalla principal de FARO (propuesta A "El mapa primero").
// En la compu, tres columnas: a la izquierda la lista de lugares con sus filtros, en el centro el mapa y,
// a la derecha, la ficha del lugar elegido. La lista y el mapa muestran los mismos lugares.
// En el celular y la tablet (usePantallaAngosta): el mapa ocupa todo, los botoncitos van arriba,
// "Ver como lista" muestra la lista encima, al tocar un lugar sube una tarjeta desde abajo y
// "Ver ficha e historia" abre la ficha completa encima del mapa.
// params.lugarId: el lugar con el que arranca abierta la ficha (por ejemplo, al volver de "+ Nueva OT acá").
function PaginaMapa({ params, onNavegar }) {
  const { usuario } = useSesion()
  const puedeRevisar = puedeVer(usuario, 'infraestructura')
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
  const [lugarActivoId, setLugarActivoId] = useState(params?.lugarId ?? null) // el lugar elegido: su ficha se ve a la derecha
  const [seleccion, setSeleccion] = useState(null) // pedido de "ir a este lugar" para el mapa
  const lugarInicial = useRef(params?.lugarId ?? null) // el lugar con el que se llegó (no cambia mientras se usa la pantalla)
  // Cuadrillas, para "Asignar cuadrilla" en la ficha. Si fallan, el mapa funciona igual.
  const [cuadrillas, setCuadrillas] = useState([])
  const [cargandoCuadrillas, setCargandoCuadrillas] = useState(true)
  const [errorCuadrillas, setErrorCuadrillas] = useState(null)
  // Solo en pantallas angostas: qué se ve ('mapa' o 'lista') y si la ficha completa está abierta encima
  const angosta = usePantallaAngosta()
  const [vistaAngosta, setVistaAngosta] = useState('mapa')
  const [fichaAbierta, setFichaAbierta] = useState(false)
  // Agregar un lugar tocando el mapa (encargado y mesa de entradas)
  const puedeAgregar = puedeAgregarLugar(usuario)
  const [agregando, setAgregando] = useState(false)
  const [puntoNuevo, setPuntoNuevo] = useState(null) // { latitud, longitud } del pin
  const [aviso, setAviso] = useState('') // "Se registró ..." (se borra solo a los pocos segundos)
  const hojaLugarNuevo = useRef(null) // celular: la hoja del formulario, para que el mapa no deje el pin debajo

  function cargarDatos() {
    // Sin los tres no se puede armar el mapa: si falla uno, es un error de carga.
    return Promise.all([listarPuntos(), listarOrdenes(), listarEstados()])
      .then(([datosLugares, datosOrdenes, datosEstados]) => {
        setLugares([...datosLugares].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
        setOrdenes(datosOrdenes)
        setEstados(datosEstados)
        setError(null)
        // Si se llegó con un lugar elegido (buscador, "Volver al mapa"), el mapa va hacia él cuando ya están los datos
        if (lugarInicial.current != null) setSeleccion({ lugarId: lugarInicial.current, vez: 1 })
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

  function cargarCuadrillas() {
    return listarCuadrillas()
      .then((datos) => {
        setCuadrillas(datos)
        setErrorCuadrillas(null)
      })
      .catch((e) => {
        console.error(e)
        setErrorCuadrillas('No se pudieron cargar las cuadrillas.')
      })
      .finally(() => setCargandoCuadrillas(false))
  }

  useEffect(() => {
    cargarDatos()
    cargarCuadrillas()
  }, [])

  // Mientras se agrega un lugar, Escape cancela (como cerrar el formulario).
  useEffect(() => {
    if (!agregando) return
    function alApretarTecla(evento) {
      if (evento.key === 'Escape') cancelarAgregar()
    }
    document.addEventListener('keydown', alApretarTecla)
    return () => document.removeEventListener('keydown', alApretarTecla)
  }, [agregando])

  // El aviso de "Se registró..." desaparece solo.
  useEffect(() => {
    if (!aviso) return
    const reloj = window.setTimeout(() => setAviso(''), 6000)
    return () => window.clearTimeout(reloj)
  }, [aviso])

  function empezarAgregar() {
    setLugarActivoId(null) // se cierra la ficha que estuviera abierta: en su lugar va el formulario
    setFichaAbierta(false)
    setVistaAngosta('mapa')
    setPuntoNuevo(null)
    setAviso('')
    setAgregando(true)
  }

  function cancelarAgregar() {
    setAgregando(false)
    setPuntoNuevo(null)
  }

  // El backend registró el lugar: se suma a la lista, se elige y el mapa va hacia él.
  function alGuardarLugar(creado) {
    setAgregando(false)
    setPuntoNuevo(null)
    setLugares((anteriores) => [...anteriores, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    setLugarActivoId(creado.id)
    setSeleccion((anterior) => ({ lugarId: creado.id, vez: (anterior?.vez ?? 0) + 1 }))
    setAviso(`Se registró "${creado.nombre}".`)
  }

  // Se asignó una cuadrilla desde la ficha: reemplazamos esa OT (cambió de estado y de cuadrilla)
  // y volvemos a pedir las cuadrillas, porque su disponibilidad pudo cambiar.
  function alAsignar(actualizada) {
    setOrdenes((anteriores) => anteriores.map((orden) => (orden.id === actualizada.id ? actualizada : orden)))
    cargarCuadrillas()
  }

  // Se recalcula solo cuando cambian los datos o los filtros: el mapa redibuja solo si cambian estas listas.
  const abiertas = useMemo(() => ordenesAbiertas(ordenes, estados), [ordenes, estados])
  const abiertasFiltradas = useMemo(() => filtrarOrdenes(abiertas, filtros), [abiertas, filtros])
  // Solo se dibujan los lugares que están en el pueblo; los mal ubicados se avisan en la lista.
  const { dentro: lugaresConUbicacion, fuera: fueraDeZona } = useMemo(() => separarPorZona(lugares), [lugares])
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
  // En el celular se vuelve al mapa y sube la tarjeta del lugar.
  function elegirDesdeLista(lugarId) {
    cancelarAgregar()
    setLugarActivoId(lugarId)
    setSeleccion((anterior) => ({ lugarId, vez: (anterior?.vez ?? 0) + 1 }))
    setVistaAngosta('mapa')
    setFichaAbierta(false)
  }

  // Tocado en el mapa
  function elegirEnMapa(lugarId) {
    setLugarActivoId(lugarId)
    setFichaAbierta(false)
  }

  // La "X" de la ficha: en la compu la cierra; en el celular vuelve a la tarjeta
  function cerrarFicha() {
    if (angosta) setFichaAbierta(false)
    else setLugarActivoId(null)
  }

  function abrirFichaCompleta() {
    setFichaAbierta(true)
    // El foco va al nombre del lugar en la ficha (para teclado y lector de pantalla)
    requestAnimationFrame(() => document.getElementById('titulo-panel-lugar')?.focus())
  }

  const verHistoria = (lugarId) => onNavegar('ficha', { lugarId })
  const nuevaOrden = (lugarId) => onNavegar('ordenes', { lugarId, desde: 'mapa' })

  function verTodos() {
    setFiltrosLugares(FILTROS_LUGARES_VACIOS)
    setFiltros(FILTROS_ORDENES_VACIOS)
    setSoloVisibles(false)
  }

  let mensajeVacio
  if (lugares.length === 0) {
    mensajeVacio = {
      titulo: 'Todavía no hay lugares registrados',
      texto: puedeRevisar ? 'Registralos en Infraestructura para verlos en el mapa.' : 'Consultá al encargado para registrar los lugares del municipio.',
      accion: puedeRevisar ? { texto: 'Ir a Infraestructura', alHacer: () => onNavegar('infraestructura') } : undefined,
    }
  } else if (resumenes.length === 0) {
    mensajeVacio = { titulo: 'Ningún lugar tiene la ubicación dentro del pueblo',
      texto: puedeRevisar ? 'Revisá las coordenadas en Infraestructura.' : 'Consultá al encargado para revisar las ubicaciones.' }
  } else if (enMapa.length === 0) {
    mensajeVacio = {
      titulo: 'Ningún lugar coincide con los filtros',
      texto: 'Probá apagando algún botoncito o limpiando "Más filtros".',
      accion: { texto: 'Ver todos los lugares', alHacer: verTodos },
    }
  } else {
    mensajeVacio = { titulo: 'No hay lugares en la zona que se ve', texto: 'Alejá el mapa para ver más lugares.' }
  }

  const mostrarTarjeta = !agregando && angosta && resumenActivo && !fichaAbierta
  const mostrarPanel = !agregando && resumenActivo && (!angosta || fichaAbierta)
  let clase = 'pantalla-mapa'
  if (angosta) clase += ` pantalla-mapa-angosta vista-${vistaAngosta}${mostrarTarjeta || agregando ? ' con-tarjeta' : ''}${agregando ? ' agregando-lugar' : ''}`
  else if (resumenActivo || agregando) clase += ' pantalla-mapa-con-ficha'

  return (
    <div className={clase}>
      {/* En el celular, mientras se ve el mapa, la lista (con su título) está escondida: el título queda para lectores */}
      {angosta && vistaAngosta === 'mapa' && <h1 className="solo-lectores">Mapa de lugares</h1>}
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
          lugarActivoId={lugarActivoId} onElegir={elegirDesdeLista} mensajeVacio={mensajeVacio}
          fueraDeZona={fueraDeZona} onRevisarFuera={puedeRevisar ? () => onNavegar('infraestructura') : undefined}>
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
          onSeleccionar={elegirEnMapa} onLimites={setZonaVisible}
          agregando={agregando} puntoNuevo={puntoNuevo} onElegirPunto={setPuntoNuevo}
          hojaAbajo={angosta ? hojaLugarNuevo : null} />

        {/* Encargado y mesa de entradas: agregar un lugar tocando el mapa (sin escribir coordenadas) */}
        {puedeAgregar && !agregando && !cargando && !error && (
          <button type="button" className="boton boton-primario boton-agregar-lugar" onClick={empezarAgregar}>
            <Icono nombre="agregar" />Agregar lugar
          </button>
        )}

        <p className="aviso-mapa" role="status" aria-live="polite" hidden={!aviso}>
          {aviso && <><Icono nombre="guardar" />{aviso}</>}
        </p>

        {/* Celular y tablet: botoncitos arriba del mapa (se deslizan de costado) y "Ver como lista" */}
        {angosta && (
          <>
            <BotoncitosLugares filtros={filtrosLugares} onCambiar={setFiltrosLugares} className="botoncitos-sobre-mapa" />
            <button type="button" className="boton-flotante boton-ver-lista" onClick={() => setVistaAngosta('lista')}>
              <Icono nombre="lista" />Ver como lista
            </button>
          </>
        )}

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

      {angosta && vistaAngosta === 'lista' && (
        <button type="button" className="boton-flotante boton-ver-mapa" onClick={() => setVistaAngosta('mapa')}>
          <Icono nombre="mapa" />Ver mapa
        </button>
      )}

      {/* Agregar un lugar: el formulario ocupa el lugar de la ficha (compu) o sube desde abajo (celular) */}
      {agregando && (
        <div ref={hojaLugarNuevo} className={angosta ? 'hoja-lugar-nuevo' : 'contenedor-lugar-nuevo'}>
          <FormularioLugarMapa punto={puntoNuevo} onGuardado={alGuardarLugar} onCancelar={cancelarAgregar} />
        </div>
      )}

      {mostrarTarjeta && (
        <TarjetaLugar key={resumenActivo.lugar.id} resumen={resumenActivo}
          onCerrar={() => setLugarActivoId(null)} onVerFicha={abrirFichaCompleta} onNuevaOrden={nuevaOrden} />
      )}

      {/* key: al elegir otro lugar, el panel arranca de cero (se vuelve a pedir su historia) */}
      {mostrarPanel && (
        <PanelLugar key={resumenActivo.lugar.id} resumen={resumenActivo}
          onCerrar={cerrarFicha} onVerHistoria={verHistoria} onNuevaOrden={nuevaOrden}
          asignacion={{ estados, cuadrillas, cargandoCuadrillas, errorCuadrillas, onAsignada: alAsignar }} />
      )}
    </div>
  )
}

export default PaginaMapa