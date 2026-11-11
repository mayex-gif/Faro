// El dibujo del poste de luz de la pestaña Luminarias (poste de metal, brazo, lámpara y base en el piso).
// Es HTML FIJO: no lleva ningún dato escrito por usuarios (nombres, descripciones), solo la clase del estado.
// Por eso se puede usar en el ícono de Leaflet (L.divIcon) y en la leyenda sin riesgo.
// Los degradés (metal, carcasa, luz y cono) se definen una sola vez en la página: components/DefinicionesPoste.jsx.
import { ESTADOS_LUMINARIA } from './luminarias.js'

const CLAVES = new Set(ESTADOS_LUMINARIA.map((estado) => estado.clave))

// Tamaño del dibujo en el mapa y punto que "apoya" en la ubicación (el medio de la base, abajo).
export const TAMANO_POSTE = [26, 45]
export const ANCLA_POSTE = [12, 43]

const SVG_POSTE = '<svg class="poste-dibujo" viewBox="0 0 30 52" aria-hidden="true" focusable="false">'
  + '<ellipse class="poste-base" cx="14" cy="47.5" rx="11" ry="3.6"/>'
  + '<path class="poste-cono" d="M20.5 10.5 L11 40 L36 40 L26.5 10.5z" fill="url(#faro-poste-cono)"/>'
  + '<g class="poste-cuerpo">'
  + '<path d="M9.5 47.5h9l-1.6-5h-5.8z" fill="url(#faro-poste-metal)"/>'
  + '<rect x="12.3" y="11" width="3.4" height="32" rx="1.4" fill="url(#faro-poste-metal)"/>'
  + '<path d="M14 13.5q0-7.5 8.5-7.5" fill="none" stroke="#4E5B62" stroke-width="2.6" stroke-linecap="round"/>'
  + '<path d="M13.4 13.1q0-7.5 8.5-7.5" fill="none" stroke="#C9D3D8" stroke-width="0.9" stroke-linecap="round"/>'
  + '<path d="M18.5 4.2h10a1.2 1.2 0 0 1 1.1 1.6l-1.8 3.6h-8.6l-1.8-3.6a1.2 1.2 0 0 1 1.1-1.6z" fill="url(#faro-poste-carcasa)"/>'
  + '<ellipse class="poste-foco" cx="23.5" cy="9.6" rx="4.1" ry="1.9"/>'
  + '</g></svg>'

// Una insignia chiquita arriba a la izquierda: ✕ en las apagadas, llave en las que están en arreglo.
const INSIGNIAS = {
  apagada: '<span class="poste-insignia poste-insignia-apagada"><svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">'
    + '<path d="M2.5 2.5l5 5M7.5 2.5l-5 5"/></svg></span>',
  arreglo: '<span class="poste-insignia poste-insignia-arreglo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'
    + '</svg></span>',
}

// El HTML del poste para un estado ('funciona', 'apagada', 'arreglo', 'falta'). Un estado desconocido se dibuja como 'funciona'.
export function htmlPoste(estado) {
  const clave = CLAVES.has(estado) ? estado : 'funciona'
  return `<span class="poste poste-${clave}">${SVG_POSTE}${INSIGNIAS[clave] ?? ''}</span>`
}
