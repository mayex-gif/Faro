// Cómo se ordena la navegación de FARO (propuesta A "El mapa primero", aprobada por el equipo el 14/10/2026).
// Solo datos y funciones puras, así se pueden probar con "npm test".
// Qué componente se dibuja para cada clave lo decide App.jsx (PAGINAS).

// La pantalla con la que arranca FARO: todo gira alrededor de los lugares.
export const INICIO = 'mapa'

// Las tres secciones que siempre están a la vista: arriba en la compu, abajo en el celular.
export const SECCIONES = [
  { clave: 'mapa', titulo: 'Mapa', icono: 'mapa' },
  { clave: 'ordenes', titulo: 'Trabajos', icono: 'orden' },
  { clave: 'asignacion', titulo: 'Cuadrillas', icono: 'cuadrilla' },
]

// Lo que queda en el menú "Más". Mis tareas sale de acá cuando haya login y roles
// (cada capataz va a entrar directo a sus tareas).
export const MAS = [
  { clave: 'infraestructura', titulo: 'Infraestructura', icono: 'infraestructura' },
  { clave: 'tareas', titulo: 'Mis tareas', icono: 'tareas' },
]

// Pantallas que existen pero no están en el menú: se llega desde otra pantalla.
// La Ficha histórica completa se abre con "Ver toda la historia" (ficha del mapa), "Ficha" (Infraestructura)
// o desde Mis tareas, siempre con el lugar ya elegido.
export const FUERA_DEL_MENU = [
  { clave: 'ficha', titulo: 'Ficha histórica', icono: 'historial' },
]

// El botón "+ Nuevo": cada opción lleva a la pantalla que tiene ese formulario.
export const NUEVO = [
  { clave: 'ordenes', titulo: 'Nueva orden de trabajo', icono: 'orden' },
  { clave: 'infraestructura', titulo: 'Nuevo lugar', icono: 'lugar' },
]

// ¿La pantalla está dentro de "Más"? (para marcar "Más" como la sección actual)
export function estaEnMas(clave) {
  return MAS.some((seccion) => seccion.clave === clave)
}

// Nombre de la pantalla para la pestaña del navegador: "Trabajos | FARO"
export function tituloDe(clave) {
  return [...SECCIONES, ...MAS, ...FUERA_DEL_MENU].find((seccion) => seccion.clave === clave)?.titulo ?? 'FARO'
}

// Pantallas que ocupan todo el lugar debajo de la barra (sin márgenes ni pie de página): el mapa.
const PANTALLA_COMPLETA = ['mapa']

export function esPantallaCompleta(clave) {
  return PANTALLA_COMPLETA.includes(clave)
}
