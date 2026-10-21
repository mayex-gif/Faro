// Estado global de la sesión (FRONTEND_AUTENTICACION_Y_ROLES.md, 3.2).
// Guarda token + usuario en localStorage y los sincroniza con api/cliente.js, que es quien
// efectivamente manda el header Authorization y detecta cuándo la sesión venció (401).
// Exporta también useAuth(): la pantalla de login y el resto de la app lo necesitan junto al
// AuthProvider, así que este archivo queda afuera de la recarga rápida de componentes.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { iniciarSesion, obtenerPerfil } from '../api/auth'
import { alRecibirSesionVencida, establecerToken } from '../api/cliente'
import { estaAutenticado as calcularEstaAutenticado, tieneRol as calcularTieneRol } from '../utils/auth'

const CLAVE_TOKEN = 'faro_token'
const CLAVE_USUARIO = 'faro_usuario'

function leerSesionGuardada() {
  try {
    const token = localStorage.getItem(CLAVE_TOKEN)
    const usuarioGuardado = localStorage.getItem(CLAVE_USUARIO)
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null
    return calcularEstaAutenticado(token, usuario) ? { token, usuario } : { token: null, usuario: null }
  } catch {
    // el navegador no deja leer localStorage (modo privado, cuota agotada, etc.): arranca sin sesión
    return { token: null, usuario: null }
  }
}

function guardarSesion(token, usuario) {
  try {
    localStorage.setItem(CLAVE_TOKEN, token)
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
  } catch {
    // sin almacenamiento: la sesión vale solo mientras la pestaña esté abierta
  }
}

function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem(CLAVE_USUARIO)
  } catch {
    // nada que borrar si no se pudo guardar
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Lee la sesión guardada antes del primer dibujado (no en un efecto): así no hay parpadeo
  // entre el login y la app mientras se confirma el token con el backend.
  const [sesion, setSesion] = useState(() => {
    const guardada = leerSesionGuardada()
    if (guardada.token) establecerToken(guardada.token)
    return guardada
  })
  const { token, usuario } = sesion

  function cerrarSesion() {
    establecerToken(null)
    borrarSesion()
    setSesion({ token: null, usuario: null })
  }

  // Si había una sesión guardada, confirma en segundo plano que el token siga siendo válido.
  // Si venció o es inválido, el 401 de obtenerPerfil ya dispara alRecibirSesionVencida (cliente.js).
  useEffect(() => {
    alRecibirSesionVencida(cerrarSesion)
    if (!token) return

    obtenerPerfil()
      .then((perfilActual) => {
        guardarSesion(token, perfilActual)
        setSesion((anterior) => (anterior.token ? { token: anterior.token, usuario: perfilActual } : anterior))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email, password) {
    const respuesta = await iniciarSesion(email, password)
    establecerToken(respuesta.token)
    guardarSesion(respuesta.token, respuesta.usuario)
    setSesion({ token: respuesta.token, usuario: respuesta.usuario })
    return respuesta.usuario
  }

  function logout() {
    cerrarSesion()
  }

  function tieneRol(...rolesPermitidos) {
    return calcularTieneRol(usuario, ...rolesPermitidos)
  }

  const valor = {
    usuario,
    token,
    estaAutenticado: calcularEstaAutenticado(token, usuario),
    login,
    logout,
    tieneRol,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth se tiene que usar dentro de <AuthProvider>')
  return contexto
}
