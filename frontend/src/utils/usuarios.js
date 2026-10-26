// Lógica de la pantalla "Usuarios" (sin React), para poder probarla con "npm test".
// Las mismas reglas las valida el backend: acá solo se avisan antes de mandar el pedido.
import { NOMBRES_ROL } from './permisos.js'

const CAPATAZ = 'CAPATAZ_CUADRILLA'
const ENCARGADO = 'ENCARGADO_CORRALON'

export const CLAVE_MINIMA = 8
const CLAVE_MAXIMA = 72
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Los roles para elegir en el formulario, en el orden en que se muestran.
export const ROLES = Object.entries(NOMBRES_ROL).map(([valor, nombre]) => ({ valor, nombre }))

export const FORMULARIO_VACIO = { nombre: '', apellido: '', email: '', rol: '', cuadrillaId: '', clave: '' }

export function esCapataz(rol) {
  return rol === CAPATAZ
}

// Datos de un usuario existente para editarlo (la clave no se edita acá).
export function formularioDesde(usuario) {
  return {
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    email: usuario.email ?? '',
    rol: usuario.rol ?? '',
    cuadrillaId: usuario.cuadrillaId == null ? '' : String(usuario.cuadrillaId),
    clave: '',
  }
}

export function validarClave(clave) {
  const largo = (clave ?? '').length
  if (largo === 0) return 'Escribí una clave'
  if (largo < CLAVE_MINIMA || largo > CLAVE_MAXIMA) return `La clave tiene que tener entre ${CLAVE_MINIMA} y ${CLAVE_MAXIMA} caracteres`
  return ''
}

// Devuelve { campo: 'mensaje' } con lo que falta o está mal. Vacío = se puede guardar.
// esAlta: en el alta se pide la clave inicial; al modificar, no.
export function validarFormulario(formulario, { esAlta }) {
  const errores = {}
  if (!formulario.nombre.trim()) errores.nombre = 'Escribí el nombre'
  if (!formulario.apellido.trim()) errores.apellido = 'Escribí el apellido'
  const email = formulario.email.trim()
  if (!email) errores.email = 'Escribí el email'
  else if (!FORMATO_EMAIL.test(email)) errores.email = 'El email no tiene un formato válido'
  if (!formulario.rol) errores.rol = 'Elegí un rol'
  if (esCapataz(formulario.rol) && !formulario.cuadrillaId) errores.cuadrillaId = 'Elegí la cuadrilla a cargo del capataz'
  if (esAlta) {
    const errorClave = validarClave(formulario.clave)
    if (errorClave) errores.clave = errorClave
  }
  return errores
}

// Lo que se manda al backend. La cuadrilla solo va si es capataz; la clave solo en el alta.
export function pedidoDesde(formulario, { esAlta }) {
  const pedido = {
    nombre: formulario.nombre.trim(),
    apellido: formulario.apellido.trim(),
    email: formulario.email.trim().toLowerCase(),
    rol: formulario.rol,
    cuadrillaId: esCapataz(formulario.rol) ? Number(formulario.cuadrillaId) : null,
  }
  if (esAlta) pedido.clave = formulario.clave
  return pedido
}

export function nombreCompleto(usuario) {
  return `${usuario.nombre} ${usuario.apellido}`.trim()
}

export function nombreRol(rol) {
  return NOMBRES_ROL[rol] ?? rol
}

// Nombre de la cuadrilla del capataz ("—" para los otros roles).
export function nombreCuadrilla(cuadrillaId, cuadrillas) {
  if (cuadrillaId == null) return '—'
  return cuadrillas.find((c) => c.id === cuadrillaId)?.nombre ?? `Cuadrilla ${cuadrillaId}`
}

// estado: 'activos' | 'baja' | 'todos'. texto: busca en nombre, apellido y email (sin importar mayúsculas ni tildes).
export function filtrarUsuarios(usuarios, { texto = '', estado = 'activos' } = {}) {
  const buscado = normalizar(texto.trim())
  return usuarios.filter((u) => {
    if (estado === 'activos' && !u.activo) return false
    if (estado === 'baja' && u.activo) return false
    if (!buscado) return true
    return normalizar(`${u.nombre} ${u.apellido} ${u.email}`).includes(buscado)
  })
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Si no se puede dar de baja a esta persona, devuelve el motivo (para mostrarlo en vez del botón); si se puede, ''.
// sesion: el usuario que está usando FARO. usuarios: la lista completa (para contar encargados activos).
export function motivoParaNoDarDeBaja(usuario, sesion, usuarios) {
  if (!usuario.activo) return ''
  if (usuario.id === sesion?.id) return 'Es tu cuenta'
  const encargadosActivos = usuarios.filter((u) => u.rol === ENCARGADO && u.activo).length
  if (usuario.rol === ENCARGADO && encargadosActivos <= 1) return 'Es el único encargado activo'
  return ''
}
