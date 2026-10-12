import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { colorDelResumen, radioDelResumen } from '../utils/mapa'
import { PRIORIDADES, etiqueta } from '../utils/ordenesTrabajo'
import { etiquetaTipoLugar } from '../utils/lugares'

// RNF10: el mapa lo da un servicio externo. Se usa OpenStreetMap con Leaflet: es gratuito y no pide clave.
// Los mosaicos públicos de OSM son para un uso moderado: si el uso crece, hay que pasar a un proveedor propio.
const URL_MOSAICOS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATRIBUCION = '&copy; Colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// Solo se usa si todavía no hay lugares para encuadrar. Es el centro de Córdoba capital: ajustarlo a la zona del municipio.
const CENTRO_POR_DEFECTO = [-31.4201, -64.1888]
const MAXIMO_EN_POPUP = 5

// El contenido del popup se arma con textContent (nunca con HTML): los nombres y descripciones los escriben usuarios.
function crearPopup(resumen, alVerFicha) {
  const caja = document.createElement('div')
  caja.className = 'popup-lugar'

  const titulo = document.createElement('strong')
  titulo.textContent = resumen.lugar.nombre
  const tipo = document.createElement('span')
  tipo.className = 'popup-tipo'
  tipo.textContent = etiquetaTipoLugar(resumen.lugar.tipo)
  caja.append(titulo, tipo)

  if (resumen.ordenes.length === 0) {
    const vacio = document.createElement('p')
    vacio.textContent = 'Sin trabajos abiertos.'
    caja.append(vacio)
  } else {
    const lista = document.createElement('ul')
    for (const orden of resumen.ordenes.slice(0, MAXIMO_EN_POPUP)) {
      const item = document.createElement('li')
      item.textContent = `OT #${orden.id} · ${orden.descripcion} · ${etiqueta(PRIORIDADES, orden.prioridad)} · ${orden.estadoNombre ?? 'sin estado'}`
      lista.append(item)
    }
    caja.append(lista)
    if (resumen.ordenes.length > MAXIMO_EN_POPUP) {
      const resto = document.createElement('p')
      resto.textContent = `y ${resumen.ordenes.length - MAXIMO_EN_POPUP} más`
      caja.append(resto)
    }
  }

  const boton = document.createElement('button')
  boton.type = 'button'
  boton.className = 'boton boton-tabla'
  boton.textContent = 'Ver ficha histórica'
  boton.addEventListener('click', () => alVerFicha(resumen.lugar.id))
  caja.append(boton)
  return caja
}

// Props:
// - resumenes: lo que se dibuja, un elemento por lugar (ver agruparPorLugar en utils/mapa.js)
// - modoColor: 'prioridad' o 'estado'
// - limites: { sur, oeste, norte, este } para encuadrar el mapa cuando cambian (o null)
// - seleccion: { lugarId, vez } → centra el mapa en ese lugar y abre su popup (vez cambia aunque se repita el lugar)
// - onSeleccionar(lugarId): se tocó un lugar en el mapa
// - onLimites(zona): el mapa se movió; zona = { sur, oeste, norte, este } de lo que se ve
// - onVerFicha(lugarId): botón del popup
// Las marcas del mapa no se pueden recorrer con el teclado: la lista que acompaña al mapa tiene los mismos datos.
function MapaLugares({ resumenes, modoColor, limites, seleccion, onSeleccionar, onLimites, onVerFicha }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const grupo = useRef(null)
  const capasPorLugar = useRef(new Map())
  const avisos = useRef({})

  // Los avisos siempre apuntan a las funciones más nuevas de la página.
  useEffect(() => {
    avisos.current = { onSeleccionar, onLimites, onVerFicha }
  })

  // Crear el mapa una sola vez.
  useEffect(() => {
    const capas = capasPorLugar.current
    const instancia = L.map(contenedor.current, { center: CENTRO_POR_DEFECTO, zoom: 14 })
    L.tileLayer(URL_MOSAICOS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(instancia)
    grupo.current = L.layerGroup().addTo(instancia)
    mapa.current = instancia

    const avisarZona = () => {
      const zona = instancia.getBounds()
      avisos.current.onLimites?.({ sur: zona.getSouth(), oeste: zona.getWest(), norte: zona.getNorth(), este: zona.getEast() })
    }
    instancia.on('moveend', avisarZona)
    avisarZona()

    return () => {
      instancia.remove()
      mapa.current = null
      grupo.current = null
      capas.clear()
    }
  }, [])

  // Dibujar los lugares cada vez que cambian los datos o el criterio de color.
  useEffect(() => {
    if (!grupo.current) return
    grupo.current.clearLayers()
    capasPorLugar.current.clear()

    for (const resumen of resumenes) {
      const color = colorDelResumen(resumen, modoColor)
      const sinTrabajos = !resumen.principal
      const capa = L.geoJSON({ type: 'Feature', properties: {}, geometry: resumen.lugar.ubicacion }, {
        // Puntos (luminarias): círculo. El tamaño crece con la prioridad.
        pointToLayer: (_, posicion) => L.circleMarker(posicion, {
          radius: radioDelResumen(resumen), color: '#FFFFFF', weight: 2, fillColor: color, fillOpacity: sinTrabajos ? 0.7 : 1,
        }),
        // Líneas (calles) y polígonos (espacios verdes)
        style: () => ({ color, weight: sinTrabajos ? 3 : 6, opacity: sinTrabajos ? 0.7 : 0.95, fillColor: color, fillOpacity: 0.35 }),
      })
      capa.bindPopup(() => crearPopup(resumen, (id) => avisos.current.onVerFicha?.(id)))
      capa.on('click', () => avisos.current.onSeleccionar?.(resumen.lugar.id))
      capa.addTo(grupo.current)
      capasPorLugar.current.set(resumen.lugar.id, capa)
    }
  }, [resumenes, modoColor])

  // Encuadrar todos los lugares cuando llegan (o cambian).
  useEffect(() => {
    if (!mapa.current || !limites) return
    mapa.current.fitBounds([[limites.sur, limites.oeste], [limites.norte, limites.este]],
      { padding: [32, 32], maxZoom: 17, animate: false })
  }, [limites])

  // Ir a un lugar elegido desde la lista.
  useEffect(() => {
    if (!seleccion || !mapa.current) return
    const capa = capasPorLugar.current.get(seleccion.lugarId)
    if (!capa) return
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const zona = capa.getBounds()
    if (zona.getSouthWest().equals(zona.getNorthEast())) {
      mapa.current.setView(zona.getCenter(), Math.max(mapa.current.getZoom(), 17), { animate: animar })
    } else {
      mapa.current.fitBounds(zona, { maxZoom: 18, padding: [40, 40], animate: animar })
    }
    capa.openPopup()
  }, [seleccion])

  return (
    <div id="mapa-lugares" ref={contenedor} className="mapa" role="region"
      aria-label="Mapa de lugares y trabajos abiertos. La lista que está junto al mapa tiene los mismos datos en texto." />
  )
}

export default MapaLugares
