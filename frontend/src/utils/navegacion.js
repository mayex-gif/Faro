// Cómo se ordena la navegación de FARO (propuesta A "El mapa primero", aprobada por el equipo el 14/10/2026).
// Solo datos y funciones puras, así se pueden probar con "npm test".
// Qué componente se dibuja para cada clave lo decide App.jsx (PAGINAS).
import { ROLES } from './auth.js'

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

// Qué roles pueden ver cada pantalla (FRONTEND_AUTENTICACION_Y_ROLES.md, sección 3.6).
// Una pantalla sin entrada acá es visible para cualquier usuario logueado (ej.: la ficha histórica,
// que se abre desde el mapa, Infraestructura o Mis tareas, cualquiera sea el rol).
const ACCESO_POR_PANTALLA = {
  infraestructura: [ROLES.ENCARGADO_CORRALON],
  asignacion: [ROLES.ENCARGADO_CORRALON],
  ordenes: [ROLES.ENCARGADO_CORRALON, ROLES.MESA_ENTRADAS],
  tareas: [ROLES.ENCARGADO_CORRALON, ROLES.CAPATAZ_CUADRILLA],
}

// ¿El rol indicado puede entrar a esa pantalla? Sin rol (todavía no hay sesión), no puede entrar a ninguna.
export function puedeVer(rol, clave) {
  if (!rol) return false
  const permitidos = ACCESO_POR_PANTALLA[clave]
  return permitidos ? permitidos.includes(rol) : true
}

// Las secciones y lo que queda en "Más", filtradas para el rol logueado.
export function seccionesPara(rol) {
  return SECCIONES.filter((seccion) => puedeVer(rol, seccion.clave))
}

export function masPara(rol) {
  return MAS.filter((seccion) => puedeVer(rol, seccion.clave))
}

// Con qué pantalla arranca cada rol al iniciar sesión. El capataz entra directo a sus tareas
// (FRONTEND_AUTENTICACION_Y_ROLES.md, 3.6): el resto arranca en el mapa, como siempre.
export function inicioPara(rol) {
  return rol === ROLES.CAPATAZ_CUADRILLA ? 'tareas' : INICIO
}
