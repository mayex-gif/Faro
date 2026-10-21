import { useEffect, useState } from 'react'
import { iniciarSesion, obtenerPerfil } from '../api/auth'
import { rolConocido } from '../utils/permisos'
import {
  CLAVE_TOKEN, CLAVE_USUARIO, EVENTO_SESION_TERMINADA, guardarSesion, leerToken,
  limpiarSesion, olvidarSesionTemporal, terminarSesion, tokenVigente, vencimientoToken,
} from '../utils/sesion'
import { ContextoSesion } from './useSesion'

function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    function alTerminar(evento) {
      setUsuario(null)
      setError('')
      setMensaje(evento.detail)
    }
    function alCambiarOtraPestana(evento) {
      if (evento.key && evento.key !== CLAVE_TOKEN && evento.key !== CLAVE_USUARIO) return
      olvidarSesionTemporal()
      setUsuario(null)
      setCargando(true)
      setError('')
      setMensaje('')
      setIntento((anterior) => anterior + 1)
    }
    window.addEventListener(EVENTO_SESION_TERMINADA, alTerminar)
    window.addEventListener('storage', alCambiarOtraPestana)
    return () => {
      window.removeEventListener(EVENTO_SESION_TERMINADA, alTerminar)
      window.removeEventListener('storage', alCambiarOtraPestana)
    }
  }, [])

  useEffect(() => {
    let vigente = true
    const token = leerToken()
    // El perfil guardado sirve como respaldo, pero para entrar volvemos a consultar al servidor.
    async function recuperar() {
      try {
        if (!token) return
        if (!tokenVigente(token)) {
          terminarSesion(token)
          return
        }
        const perfil = await obtenerPerfil()
        if (!vigente || token !== leerToken()) return
        if (!perfil.activo || !rolConocido(perfil.rol)) {
          terminarSesion(token, 'Tu cuenta no tiene acceso habilitado. Consultá al encargado.')
          return
        }
        guardarSesion(token, perfil)
        setUsuario(perfil)
      } catch (e) {
        if (!vigente || token !== leerToken()) return
        if (e.estado === 401 || e.estado === 403 || e.estado === 409) {
          terminarSesion(token, e.message)
        } else {
          setError('No pudimos verificar tu sesión. Revisá la conexión e intentá nuevamente.')
        }
      } finally {
        if (vigente) setCargando(false)
      }
    }
    recuperar()
    return () => { vigente = false }
  }, [intento])

  useEffect(() => {
    if (!usuario) return
    const token = leerToken()
    function revisarVencimiento() {
      if (!tokenVigente(token)) terminarSesion(token)
    }
    // El intervalo también cubre pestañas que el teléfono dejó suspendidas durante un rato.
    const reloj = window.setTimeout(revisarVencimiento, Math.min(vencimientoToken(token) - Date.now(), 2147483647))
    const control = window.setInterval(revisarVencimiento, 60000)
    window.addEventListener('focus', revisarVencimiento)
    return () => {
      window.clearTimeout(reloj)
      window.clearInterval(control)
      window.removeEventListener('focus', revisarVencimiento)
    }
  }, [usuario])

  async function login(email, password) {
    const respuesta = await iniciarSesion(email, password)
    if (!tokenVigente(respuesta.token) || !respuesta.usuario?.activo || !rolConocido(respuesta.usuario.rol)) {
      throw new Error('No recibimos una sesión habilitada. Consultá al encargado.')
    }
    guardarSesion(respuesta.token, respuesta.usuario)
    setError('')
    setMensaje('')
    setUsuario(respuesta.usuario)
  }

  function logout() {
    limpiarSesion()
    setUsuario(null)
    setError('')
    setMensaje('Cerraste tu sesión correctamente.')
  }

  function reintentar() {
    setError('')
    setCargando(true)
    setIntento((anterior) => anterior + 1)
  }

  return (
    <ContextoSesion.Provider value={{ usuario, cargando, error, mensaje, login, logout, reintentar }}>
      {children}
    </ContextoSesion.Provider>
  )
}

export default AuthProvider
