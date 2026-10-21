import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { NOMBRES_TIPO_LUGAR, etiquetaPrioridad } from '../utils/mapa'

// Centro aproximado de Estación General Paz (Córdoba) para cuando todavía
// no hay lugares cargados; en cuanto los hay, el mapa encuadra sobre ellos.
const CENTRO_INICIAL = [-31.1448, -64.1441]
const ZOOM_INICIAL = 15

// GeoJSON guarda las coordenadas como [longitud, latitud]; Leaflet espera [lat, lon].
function invertir([lon, lat]) {
  return [lat, lon]
}

// Arma la capa de Leaflet que corresponde al tipo de geometría del lugar
// (punto → luminaria, línea → calle, polígono → espacio verde).
function crearCapa(geometria, estiloPunto, estiloLinea, estiloPoligono) {
  if (!geometria) return null
  switch (geometria.type) {
    case 'Point':
      return L.circleMarker(invertir(geometria.coordinates), estiloPunto)
    case 'LineString':
      return L.polyline(geometria.coordinates.map(invertir), estiloLinea)
    case 'MultiLineString':
      return L.polyline(geometria.coordinates.map((linea) => linea.map(invertir)), estiloLinea)
    case 'Polygon':
      return L.polygon(geometria.coordinates.map((anillo) => anillo.map(invertir)), estiloPoligono)
    case 'MultiPolygon':
      return L.polygon(
        geometria.coordinates.map((poligono) => poligono.map((anillo) => anillo.map(invertir))),
        estiloPoligono,
      )
    default:
      return null
  }
}

// Arma el contenido del popup usando textContent en cada nodo: nunca HTML
// armado con strings, así ningún dato cargado por un usuario puede inyectar
// marcado dentro del popup.
function crearPopup({ lugar, ordenUrgente, estadoUrgente }) {
  const contenedor = document.createElement('div')
  contenedor.className = 'popup-mapa'

  const titulo = document.createElement('strong')
  titulo.textContent = lugar.nombre
  contenedor.appendChild(titulo)

  const tipo = document.createElement('span')
  tipo.textContent = NOMBRES_TIPO_LUGAR[lugar.tipo] ?? lugar.tipo
  contenedor.appendChild(tipo)

  const operativo = document.createElement('span')
  operativo.textContent = lugar.estadoOperativo ? 'Funciona correctamente' : 'Fuera de servicio'
  contenedor.appendChild(operativo)

  const ordenInfo = document.createElement('span')
  ordenInfo.textContent = ordenUrgente
    ? `OT abierta más urgente: #${ordenUrgente.id} · ${etiquetaPrioridad(ordenUrgente.prioridad)} · ${estadoUrgente?.nombre ?? '—'}`
    : 'Sin órdenes abiertas'
  contenedor.appendChild(ordenInfo)

  return contenedor
}

// Mapa con Leaflet y OpenStreetMap: dibuja los lugares (puntos, líneas o
// polígonos) coloreados según la prioridad/estado de su orden abierta más
// urgente, con popups accesibles y seguros.
function MapaInteractivo({ lugaresMapa, lugarSeleccionadoId, onLugaresVisiblesCambio }) {
  const contenedorRef = useRef(null)
  const mapaRef = useRef(null)
  const capasRef = useRef(new Map()) // lugarId -> capa de Leaflet
  const ajustadoRef = useRef(false) // si ya se hizo el primer encuadre automático

  // Crea el mapa una sola vez.
  useEffect(() => {
    const mapa = L.map(contenedorRef.current, { center: CENTRO_INICIAL, zoom: ZOOM_INICIAL })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapa)
    mapaRef.current = mapa

    function actualizarVisibles() {
      if (!onLugaresVisiblesCambio) return
      const bounds = mapa.getBounds()
      const visibles = new Set()
      capasRef.current.forEach((capa, lugarId) => {
        const dentro = capa.getBounds ? bounds.intersects(capa.getBounds()) : bounds.contains(capa.getLatLng())
        if (dentro) visibles.add(lugarId)
      })
      onLugaresVisiblesCambio(visibles)
    }
    mapa.on('moveend', actualizarVisibles)
    mapa._actualizarVisibles = actualizarVisibles

    return () => {
      mapa.off('moveend', actualizarVisibles)
      mapa.remove()
      mapaRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redibuja las capas cada vez que cambia el conjunto de lugares a mostrar.
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return

    capasRef.current.forEach((capa) => mapa.removeLayer(capa))
    capasRef.current = new Map()

    lugaresMapa.forEach(({ lugar, ordenUrgente, estadoUrgente, color }) => {
      const estiloPunto = { radius: 9, color, fillColor: color, fillOpacity: 0.85, weight: 2 }
      const estiloLinea = { color, weight: 5, opacity: 0.85 }
      const estiloPoligono = { color, fillColor: color, fillOpacity: 0.35, weight: 2 }
      const capa = crearCapa(lugar.ubicacion, estiloPunto, estiloLinea, estiloPoligono)
      if (!capa) return
      capa.bindPopup(crearPopup({ lugar, ordenUrgente, estadoUrgente }))
      capa.addTo(mapa)
      capasRef.current.set(lugar.id, capa)
    })

    // La primera vez que hay lugares, encuadramos el mapa para mostrarlos a todos.
    if (!ajustadoRef.current && capasRef.current.size > 0) {
      const grupo = L.featureGroup(Array.from(capasRef.current.values()))
      mapa.fitBounds(grupo.getBounds(), { maxZoom: 17, padding: [24, 24] })
      ajustadoRef.current = true
    }

    if (mapa._actualizarVisibles) mapa._actualizarVisibles()
  }, [lugaresMapa])

  // "Ver en el mapa" desde la lista: centra y abre el popup del lugar elegido.
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !lugarSeleccionadoId) return
    const capa = capasRef.current.get(lugarSeleccionadoId)
    if (!capa) return
    if (capa.getBounds) mapa.fitBounds(capa.getBounds(), { maxZoom: 18 })
    else mapa.setView(capa.getLatLng(), Math.max(mapa.getZoom(), 17))
    capa.openPopup()
  }, [lugarSeleccionadoId])

  return (
    <div className="mapa-contenedor" ref={contenedorRef} role="application" aria-label="Mapa interactivo de lugares de FARO" />
  )
}

export default MapaInteractivo
