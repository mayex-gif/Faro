import { useId, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Icono from '../components/Icono'
import '../estilos-login.css'

// Cuentas precargadas por InicializadorUsuarios (LOGIN_Y_ACCESOS_BACKEND.md, sección 5),
// para que el municipio pueda probar la app sin tener que crear usuarios primero.
const CUENTAS_DE_PRUEBA = [
  { rol: 'Encargado del corralón', email: 'encargado@generalpaz.gob.ar' },
  { rol: 'Capataz — Cuadrilla Verde', email: 'capataz.verde@generalpaz.gob.ar' },
  { rol: 'Capataz — Cuadrilla Alumbrado', email: 'capataz.alumbrado@generalpaz.gob.ar' },
  { rol: 'Mesa de entradas', email: 'mesadeentradas@generalpaz.gob.ar' },
]
const CONTRASENA_DE_PRUEBA = 'Faro2026!'

function mensajeDeError(error) {
  if (error.estado === 401) return 'El correo o la contraseña no son correctos.'
  if (error.estado === 409) return 'Esta cuenta está desactivada. Consultá con el encargado del corralón.'
  if (error.estado === 400) return 'Revisá el correo y la contraseña ingresados.'
  return error.message || 'No pudimos iniciar sesión. Intentá nuevamente.'
}

function PaginaLogin() {
  const { login } = useAuth()
  const idEmail = useId()
  const idPassword = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [cuentasAbiertas, setCuentasAbiertas] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await login(email.trim(), password)
      // La redirección a la pantalla inicial de cada rol la resuelve App.jsx al detectar la sesión.
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  function usarCuenta(cuentaEmail) {
    setEmail(cuentaEmail)
    setPassword(CONTRASENA_DE_PRUEBA)
    setError('')
  }

  return (
    <div className="pantalla-login">
      <main className="tarjeta-login panel" aria-labelledby="titulo-login">
        <div className="login-encabezado">
          <img src="/logo-faro.png" alt="" className="login-logo" width="56" height="56" />
          <p className="sobre-titulo">MUNICIPALIDAD DE ESTACIÓN GENERAL PAZ</p>
          <h1 id="titulo-login">Ingresar a FARO</h1>
          <p>Iniciá sesión con tu usuario municipal para gestionar el mantenimiento del corralón.</p>
        </div>

        {error && (
          <p className="mensaje mensaje-error" role="alert" aria-live="polite">
            <Icono nombre="cerrar" />
            {error}
          </p>
        )}

        <form onSubmit={enviar} noValidate>
          <div className="campo">
            <label htmlFor={idEmail}>Correo electrónico</label>
            <input id={idEmail} name="email" type="email" autoComplete="email" required
              value={email} onChange={(evento) => setEmail(evento.target.value)} disabled={enviando} />
          </div>

          <div className="campo">
            <label htmlFor={idPassword}>Contraseña</label>
            <div className="campo-password">
              <input id={idPassword} name="password" type={mostrarPassword ? 'text' : 'password'}
                autoComplete="current-password" required
                value={password} onChange={(evento) => setPassword(evento.target.value)} disabled={enviando} />
              <button type="button" className="boton-mostrar-password"
                onClick={() => setMostrarPassword((valor) => !valor)}
                aria-pressed={mostrarPassword}>
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                <span className="solo-lectores"> la contraseña</span>
              </button>
            </div>
          </div>

          <button type="submit" className="boton boton-primario boton-login" disabled={enviando}>
            {enviando && <span className="indicador-carga indicador-carga-chico" aria-hidden="true" />}
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="cuentas-prueba">
          <button type="button" className="cuentas-prueba-boton" aria-expanded={cuentasAbiertas}
            aria-controls="lista-cuentas-prueba" onClick={() => setCuentasAbiertas((valor) => !valor)}>
            <Icono nombre={cuentasAbiertas ? 'abajo' : 'mas'} />
            Cuentas de prueba del municipio
          </button>
          {cuentasAbiertas && (
            <ul id="lista-cuentas-prueba" className="lista-cuentas-prueba">
              {CUENTAS_DE_PRUEBA.map((cuenta) => (
                <li key={cuenta.email}>
                  <div>
                    <strong>{cuenta.rol}</strong>
                    <span>{cuenta.email}</span>
                  </div>
                  <button type="button" className="boton boton-secundario" onClick={() => usarCuenta(cuenta.email)}>
                    Usar esta cuenta
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default PaginaLogin
