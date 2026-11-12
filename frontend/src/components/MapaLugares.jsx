import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { colorDelResumen, radioDelResumen } from '../utils/mapa'
import { contarTrabajos } from '../utils/listaLugares'
import { datosDelEstado, puntoDe } from '../utils/luminarias'
import { ANCLA_POSTE, TAMANO_POSTE, htmlPoste } from '../utils/poste'
import { CENTRO_PUEBLO, ZONA_PUEBLO } from '../utils/zona'
import DefinicionesPoste from './DefinicionesPoste'

// RNF10: el mapa lo da un servicio externo. Se usa OpenStreetMap con Leaflet: es gratuito y no pide clave.
// Los mosaicos públicos de OSM son para un uso moderado: si el uso crece, hay que pasar a un proveedor propio.
const URL_MOSAICOS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATRIBUCION = '&copy; Colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// Solo se usa si todavía no hay lugares para encuadrar: la plaza principal de Estación General Paz.
// Leaflet pide [latitud, longitud] (al revés que GeoJSON, que guarda [longitud, latitud]).
const CENTRO_POR_DEFECTO = [CENTRO_PUEBLO.latitud, CENTRO_PUEBLO.longitud]
// La zona del pueblo (utils/zona.js): el mapa no deja moverse fuera de ella.
const LIMITES_PUEBLO = [[ZONA_PUEBLO.sur, ZONA_PUEBLO.oeste], [ZONA_PUEBLO.norte, ZONA_PUEBLO.este]]

// La etiqueta que aparece arriba de cada lugar ("Plaza principal · 2 trabajos abiertos").
// Se arma con textContent (nunca con HTML): los nombres los escriben usuarios.
// Los detalles del lugar no van en un globo sobre el mapa: se ven en la ficha, al costado.
function crearEtiqueta(resumen) {
  const texto = document.createElement('span')
  texto.textContent = `${resumen.lugar.nombre} · ${contarTrabajos(resumen.ordenes.length)}`
  return texto
}

// Pestaña Luminarias: "Luminaria San Martín · Apagada"
function crearEtiquetaLuminaria(resumen, estado) {
  const texto = document.createElement('span')
  texto.textContent = `${resumen.lugar.nombre} · ${datosDelEstado(estado)?.nombre ?? ''}`
  return texto
}

// Calles: se dibujan como en un mapa de rutas, con un borde blanco debajo y la línea de color encima.
// Así se distinguen de los bordes de los espacios verdes y se ven sobre cualquier fondo.
// El borde también agranda la zona que se puede tocar con el dedo.
const ANCHO_CALLE = { conTrabajos: 7, sinTrabajos: 4 }
const BORDE_CALLE = 4

function esLinea(geometria) {
  return geometria?.type === 'LineString' || geometria?.type === 'MultiLineString'
}

// Una capa por lugar. Las calles son un grupo de dos líneas (borde y color); el resto, una capa GeoJSON.
// atenuada: mientras se marca el tramo de otra calle, el resto del mapa queda clarito (no distrae).
function crearCapaLugar(resumen, modoColor, atenuada = false) {
  const color = colorDelResumen(resumen, modoColor)
  const factor = atenuada ? 0.3 : 1
  const sinTrabajos = !resumen.principal
  const geometria = resumen.lugar.ubicacion
  if (esLinea(geometria)) {
    // MultiLineString: una calle cortada en varios tramos (así vienen algunas de OpenStreetMap)
    const posiciones = L.GeoJSON.coordsToLatLngs(geometria.coordinates, geometria.type === 'MultiLineString' ? 1 : 0)
    const ancho = sinTrabajos ? ANCHO_CALLE.sinTrabajos : ANCHO_CALLE.conTrabajos
    return L.featureGroup([
      L.polyline(posiciones, { color: '#FFFFFF', weight: ancho + BORDE_CALLE, opacity: 0.95 * factor, lineCap: 'round', lineJoin: 'round' }),
      L.polyline(posiciones, { color, weight: ancho, opacity: (sinTrabajos ? 0.8 : 1) * factor, lineCap: 'round', lineJoin: 'round' }),
    ])
  }
  return L.geoJSON({ type: 'Feature', properties: {}, geometry: geometria }, {
    // Puntos (luminarias): círculo. El tamaño crece con la prioridad.
    pointToLayer: (_, posicion) => L.circleMarker(posicion, {
      radius: radioDelResumen(resumen), color: '#FFFFFF', weight: 2, opacity: factor, fillColor: color, fillOpacity: (sinTrabajos ? 0.7 : 1) * factor,
    }),
    // Polígonos (lugares con área: plazas, espacios verdes)
    style: () => ({ color, weight: sinTrabajos ? 3 : 6, opacity: (sinTrabajos ? 0.7 : 0.95) * factor, fillColor: color, fillOpacity: 0.35 * factor }),
  })
}

// Marcar el tramo de una OT: colores fijos del dibujo (la calle elegida, las esquinas y el tramo en naranja)
const COLOR_CALLE_ELEGIDA = '#086C80'
const COLOR_TRAMO = '#EA6A25'
const ANCHO_FRANJA_TOQUE = 36 // franja invisible sobre la calle: más fácil de tocar con el dedo
const ZOOM_MINIMO_TRAMO = 16 // más lejos, las esquinas se amontonan y es difícil tocar donde se quiere

// Etiqueta con el nombre de la calle que cruza (textContent: los nombres los escriben usuarios)
function crearEtiquetaEsquina(texto) {
  const etiqueta = document.createElement('span')
  etiqueta.textContent = texto
  return etiqueta
}

// Todo lo que se dibuja mientras se marca el tramo, encima de los lugares.
function dibujarTramo(grupoTramo, { calle, cruces, toques, vistaPrevia }) {
  const posiciones = L.GeoJSON.coordsToLatLngs(calle.ubicacion.coordinates, 0)
  L.polyline(posiciones, { color: '#000000', weight: ANCHO_FRANJA_TOQUE, opacity: 0.001, className: 'franja-tramo' }).addTo(grupoTramo)
  L.polyline(posiciones, { color: '#FFFFFF', weight: 12, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(grupoTramo)
  L.polyline(posiciones, { color: COLOR_CALLE_ELEGIDA, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(grupoTramo)
  if (vistaPrevia) {
    const tramo = L.GeoJSON.coordsToLatLngs(vistaPrevia.coordinates, 0)
    L.polyline(tramo, { color: '#FFFFFF', weight: 15, opacity: 1, lineCap: 'round', interactive: false }).addTo(grupoTramo)
    L.polyline(tramo, { color: COLOR_TRAMO, weight: 10, opacity: 1, lineCap: 'round', interactive: false }).addTo(grupoTramo)
  }
  for (const cruce of cruces) {
    L.circleMarker([cruce.punto[1], cruce.punto[0]], {
      radius: 5, color: COLOR_CALLE_ELEGIDA, weight: 2, fillColor: '#FFFFFF', fillOpacity: 1, interactive: false,
    }).bindTooltip(crearEtiquetaEsquina(cruce.calle.nombre), {
      permanent: true, direction: 'top', offset: [0, -6], className: 'etiqueta-esquina',
    }).addTo(grupoTramo)
  }
  toques.forEach((toque, indice) => {
    if (!toque.punto) return
    L.circleMarker([toque.punto[1], toque.punto[0]], {
      radius: 9, color: '#FFFFFF', weight: 3, fillColor: COLOR_TRAMO, fillOpacity: 1, interactive: false,
    }).bindTooltip(crearEtiquetaEsquina(indice === 0 ? 'Desde' : 'Hasta'), {
      permanent: true, direction: 'right', offset: [10, 0], className: 'etiqueta-toque',
    }).addTo(grupoTramo)
  })
}

const ETIQUETAS_MAPA = {
  todo: 'Mapa de lugares y trabajos abiertos. La lista que está junto al mapa tiene los mismos datos en texto.',
  luminarias: 'Mapa de luminarias y su estado. El panel que está junto al mapa tiene los mismos datos en texto.',
  calles: 'Mapa de calles y sus trabajos abiertos. La lista que está junto al mapa tiene los mismos datos en texto.',
}

// Props:
// - resumenes: lo que se dibuja, un elemento por lugar (ver agruparPorLugar en utils/mapa.js)
// - modoColor: 'prioridad' o 'estado'
// - limites: { sur, oeste, norte, este } para encuadrar el mapa cuando cambian (o null)
// - seleccion: { lugarId, vez } → centra el mapa en ese lugar y muestra su etiqueta (vez cambia aunque se repita el lugar)
// - onSeleccionar(lugarId): se tocó un lugar en el mapa
// - onLimites(zona): el mapa se movió; zona = { sur, oeste, norte, este } de lo que se ve
// Para agregar un lugar nuevo tocando el mapa:
// - agregando: true mientras se está eligiendo dónde va (el cursor cambia y tocar un lugar no abre su ficha)
// - puntosNuevo: coordenadas de la geometría temporal que se está dibujando
// - onElegirPunto(punto): se tocó el mapa o se soltó el pin después de arrastrarlo
// - hojaAbajo: (celular) ref de la hoja del formulario que sube desde abajo y tapa parte del mapa
// Pestaña Luminarias:
// - pestana: 'todo' (todos los lugares, como siempre), 'luminarias' (solo las luminarias, dibujadas como postes)
//   o 'calles' (la página pasa en "resumenes" solo las calles; se dibujan igual que en "Todo el pueblo")
// - luminarias: [{ resumen, estado }] (utils/luminarias.js → luminariasConEstado), ya sin los estados ocultos
// - zonaResaltada: { limites: { sur, norte, oeste, este } } de "¿Dónde falta luz?" (o null): se marca y se encuadra
// - noche: modo noche (solo en la pestaña Luminarias): mapa oscuro y halo de luz en las que funcionan
// Marcar el tramo de una OT en una calle (ver components/ElegirTramo.jsx):
// - tramo: null o { calle, cruces, modo, toques: [{ distancia, punto }], vistaPrevia } (vistaPrevia = LineString o null).
//   Mientras hay tramo: la calle se resalta, el resto se atenúa, las esquinas llevan su nombre y tocar
//   un lugar no abre su ficha.
// - onTocarTramo(punto): se tocó el mapa; punto = [longitud, latitud] (la página decide si cae sobre la calle)
// Las marcas del mapa no se pueden recorrer con el teclado: la lista que acompaña al mapa tiene los mismos datos.
function MapaLugares({
  resumenes, modoColor, limites, seleccion, onSeleccionar, onLimites, agregando = false, tipoNuevo = 'LUMINARIA', puntosNuevo = [], onElegirPunto, hojaAbajo = null,
  pestana = 'todo', luminarias = [], zonaResaltada = null, noche = false, tramo = null, onTocarTramo,
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const grupo = useRef(null)
  const capasPorLugar = useRef(new Map())
  const avisos = useRef({})
  const pinNuevo = useRef(null)
  const marcoZona = useRef(null)
  const dibujoNuevo = useRef(null)
  const grupoTramo = useRef(null)
  const calleDelTramo = tramo?.calle ?? null
  const modoDelTramo = tramo?.modo ?? null // al pasar de "¿Dónde es el trabajo?" a marcar, la hoja del celular cambia de alto

  // Los avisos siempre apuntan a las funciones y datos más nuevos de la página.
  useEffect(() => {
    // ocupado: se está agregando un lugar o marcando un tramo (tocar un lugar no abre su ficha)
    avisos.current = { onSeleccionar, onLimites, onElegirPunto, agregando, onTocarTramo, eligiendoTramo: Boolean(tramo),
      ocupado: agregando || Boolean(tramo) }
  })

  // Crear el mapa una sola vez.
  useEffect(() => {
    const capas = capasPorLugar.current
    // maxBounds + maxBoundsViscosity 1: si se arrastra el mapa fuera del pueblo, vuelve ("rebota").
    const instancia = L.map(contenedor.current, {
      center: CENTRO_POR_DEFECTO, zoom: 14, maxBounds: LIMITES_PUEBLO, maxBoundsViscosity: 1,
    })
    // Zoom mínimo: el que muestra la zona entera en el tamaño actual del mapa (no deja alejarse más).
    // Se recalcula cuando cambia el tamaño (celular, compu, ficha abierta o cerrada).
    const ajustarZoomMinimo = () => instancia.setMinZoom(instancia.getBoundsZoom(LIMITES_PUEBLO, true))
    ajustarZoomMinimo()
    L.tileLayer(URL_MOSAICOS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(instancia)
    grupo.current = L.layerGroup().addTo(instancia)
    mapa.current = instancia

    const avisarZona = () => {
      const zona = instancia.getBounds()
      avisos.current.onLimites?.({ sur: zona.getSouth(), oeste: zona.getWest(), norte: zona.getNorth(), este: zona.getEast() })
    }
    instancia.on('moveend', avisarZona)
    avisarZona()

    // Agregar un lugar: tocar el mapa elige el punto (solo mientras se está agregando).
    // Marcar un tramo: tocar el mapa elige el inicio o el fin (la página lo lleva a la calle).
    instancia.on('click', (evento) => {
      if (avisos.current.eligiendoTramo) {
        avisos.current.onTocarTramo?.([evento.latlng.lng, evento.latlng.lat])
        return
      }
      if (!avisos.current.agregando) return
      avisos.current.onElegirPunto?.({ latitud: evento.latlng.lat, longitud: evento.latlng.lng })
    })

    // Si la caja del mapa cambia de tamaño (por ejemplo, se abre o se cierra la ficha del lugar al costado),
    // Leaflet tiene que volver a medirla; si no, quedan franjas grises sin mosaicos.
    const observador = new ResizeObserver(() => {
      instancia.invalidateSize()
      ajustarZoomMinimo()
    })
    observador.observe(contenedor.current)

    return () => {
      observador.disconnect()
      instancia.remove()
      mapa.current = null
      grupo.current = null
      grupoTramo.current = null
      pinNuevo.current = null
      marcoZona.current = null
      dibujoNuevo.current = null
      capas.clear()
    }
  }, [])

  // Dibujar los lugares cada vez que cambian los datos, el criterio de color o la pestaña.
  useEffect(() => {
    if (!grupo.current) return
    grupo.current.clearLayers()
    capasPorLugar.current.clear()

    // Pestaña Luminarias: un poste por luminaria. El dibujo dice el estado (base de color, lámpara prendida
    // o apagada, insignia); el nombre va en la etiqueta, que se arma con textContent.
    if (pestana === 'luminarias') {
      for (const { resumen, estado } of luminarias) {
        const punto = puntoDe(resumen.lugar.ubicacion)
        if (!punto) continue
        const icono = L.divIcon({ className: 'marca-poste', html: htmlPoste(estado), iconSize: TAMANO_POSTE, iconAnchor: ANCLA_POSTE })
        // keyboard: false, como el resto de las marcas: la lista de la izquierda tiene los mismos datos
        const capa = L.marker([punto[1], punto[0]], { icon: icono, keyboard: false, riseOnHover: true })
        capa.bindTooltip(crearEtiquetaLuminaria(resumen, estado), { direction: 'top', offset: [0, -40], className: 'etiqueta-lugar' })
        capa.on('click', () => {
          if (!avisos.current.ocupado) avisos.current.onSeleccionar?.(resumen.lugar.id)
        })
        capa.addTo(grupo.current)
        capasPorLugar.current.set(resumen.lugar.id, capa)
      }
      return
    }

    for (const resumen of resumenes) {
      const capa = crearCapaLugar(resumen, modoColor, calleDelTramo != null && resumen.lugar.id !== calleDelTramo.id)
      capa.bindTooltip(crearEtiqueta(resumen), { direction: 'top', offset: [0, -8], className: 'etiqueta-lugar' })
      // Mientras se agrega un lugar (o se marca un tramo), tocar uno existente no abre su ficha:
      // el toque sigue al mapa y pone el pin (o el inicio / fin del tramo) ahí.
      capa.on('click', () => {
        if (!avisos.current.ocupado) avisos.current.onSeleccionar?.(resumen.lugar.id)
      })
      capa.addTo(grupo.current)
      capasPorLugar.current.set(resumen.lugar.id, capa)
    }
  }, [resumenes, modoColor, pestana, luminarias, calleDelTramo])

  // Marcar el tramo: la calle resaltada, sus esquinas, los toques y la vista previa en naranja.
  useEffect(() => {
    if (!mapa.current) return
    grupoTramo.current?.remove()
    grupoTramo.current = null
    if (!tramo) return
    grupoTramo.current = L.layerGroup().addTo(mapa.current)
    dibujarTramo(grupoTramo.current, tramo)
  }, [tramo])

  // Al empezar a marcar el tramo, el mapa encuadra la calle (en el celular, por encima de la hoja de abajo).
  // Si una calle larga no entra de cerca (celular), queda en un zoom cómodo para tocar y se arrastra para recorrerla.
  useEffect(() => {
    if (!mapa.current || !calleDelTramo) return
    const caja = L.latLngBounds(L.GeoJSON.coordsToLatLngs(calleDelTramo.ubicacion.coordinates, 0))
    const arriba = 70 // las pestañas del mapa
    const abajo = (hojaAbajo?.current?.offsetHeight ?? 0) + 30
    mapa.current.invalidateSize({ pan: false })
    const zoomQueEntra = mapa.current.getBoundsZoom(caja, false, L.point(80, arriba + abajo))
    const zoom = Math.min(18, Math.max(zoomQueEntra, ZOOM_MINIMO_TRAMO))
    mapa.current.setView(caja.getCenter(), zoom, { animate: false })
    // el centro de la calle queda en el medio de lo que se ve (entre las pestañas y la hoja de abajo)
    mapa.current.panBy([0, (abajo - arriba) / 2], { animate: false })
  }, [calleDelTramo, modoDelTramo, hojaAbajo])

  // "¿Dónde falta luz?": un rectángulo punteado sobre la zona elegida, y el mapa la encuadra.
  useEffect(() => {
    if (!mapa.current) return
    marcoZona.current?.remove()
    marcoZona.current = null
    if (pestana !== 'luminarias' || !zonaResaltada) return
    const { sur, oeste, norte, este } = zonaResaltada.limites
    const caja = [[sur, oeste], [norte, este]]
    marcoZona.current = L.rectangle(caja, {
      color: '#086C80', weight: 2, dashArray: '6 6', fillColor: '#1B9FB5', fillOpacity: 0.08, interactive: false,
    }).addTo(mapa.current)
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    mapa.current.fitBounds(caja, { padding: [48, 48], maxZoom: 17, animate: animar })
  }, [zonaResaltada, pestana])

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
    // Al elegir un lugar puede abrirse la ficha al costado y el mapa queda más angosto:
    // se mide antes de centrar, así el lugar queda en el medio de lo que se ve.
    mapa.current.invalidateSize({ pan: false })
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Un poste (marker) tiene un punto; los demás lugares, una caja.
    const zona = capa.getBounds ? capa.getBounds() : L.latLngBounds(capa.getLatLng(), capa.getLatLng())
    if (zona.getSouthWest().equals(zona.getNorthEast())) {
      mapa.current.setView(zona.getCenter(), Math.max(mapa.current.getZoom(), 17), { animate: animar })
    } else {
      mapa.current.fitBounds(zona, { maxZoom: 18, padding: [40, 40], animate: animar })
    }
    capa.openTooltip()
  }, [seleccion])

  // Vista previa de la geometría nueva: pin, línea o área dibujada con toques.
  useEffect(() => {
    if (!mapa.current) return
    pinNuevo.current?.remove()
    pinNuevo.current = null
    dibujoNuevo.current?.remove()
    dibujoNuevo.current = null
    if (!puntosNuevo.length) return

    if (tipoNuevo === 'LUMINARIA') {
      const punto = puntosNuevo[0]
      const posicion = [punto.latitud, punto.longitud]
      // El dibujo del pin es fijo (no lleva datos de usuarios), por eso puede ir como HTML.
      const icono = L.divIcon({ className: 'pin-nuevo', html: '<span></span>', iconSize: [30, 30], iconAnchor: [15, 30] })
      pinNuevo.current = L.marker(posicion, { icon: icono, draggable: true, title: 'Lugar nuevo: arrastralo para ajustar', alt: 'Lugar nuevo' })
        .on('dragend', () => {
          const { lat, lng } = pinNuevo.current.getLatLng()
          avisos.current.onElegirPunto?.({ latitud: lat, longitud: lng })
        })
        .addTo(mapa.current)
      const altoTapado = hojaAbajo?.current?.offsetHeight ?? 0
      if (altoTapado > 0) mapa.current.panInside(posicion, { paddingTopLeft: [0, 40], paddingBottomRight: [0, altoTapado + 16] })
      return
    }

    const grupoDibujo = L.layerGroup().addTo(mapa.current)
    dibujoNuevo.current = grupoDibujo
    const posiciones = puntosNuevo.map((punto) => [punto.latitud, punto.longitud])
    posiciones.forEach((posicion) => L.circleMarker(posicion, {
      radius: 5, color: '#FFFFFF', weight: 2, fillColor: '#EA6A25', fillOpacity: 1, interactive: false,
    }).addTo(grupoDibujo))
    if (tipoNuevo === 'CALLE' && posiciones.length >= 2) {
      L.polyline(posiciones, { color: '#EA6A25', weight: 5, opacity: 0.9, interactive: false }).addTo(grupoDibujo)
    }
    if (tipoNuevo === 'ESPACIO_VERDE' && posiciones.length >= 2) {
      L.polygon(posiciones, { color: '#EA6A25', weight: 3, fillColor: '#EA6A25', fillOpacity: 0.2, interactive: false }).addTo(grupoDibujo)
    }
  }, [tipoNuevo, puntosNuevo, hojaAbajo])

  // Mientras se agrega un lugar, el cursor es una cruz. Se usa classList (y no className) porque
  // Leaflet le agrega sus propias clases a este mismo div y React las borraría al cambiar className.
  useEffect(() => {
    contenedor.current?.classList.toggle('mapa-agregando', agregando || Boolean(calleDelTramo))
  }, [agregando, calleDelTramo])

  // Modo noche: el oscurecido de los mosaicos y los halos son puro CSS (estilos-luminarias.css), sin pedir otro mapa.
  useEffect(() => {
    contenedor.current?.classList.toggle('mapa-noche', noche && pestana === 'luminarias')
  }, [noche, pestana])

  return (
    <>
      <DefinicionesPoste />
      <div id="mapa-lugares" ref={contenedor} className="mapa" role="region"
        aria-label={ETIQUETAS_MAPA[pestana] ?? ETIQUETAS_MAPA.todo} />
    </>
  )
}

export default MapaLugares
