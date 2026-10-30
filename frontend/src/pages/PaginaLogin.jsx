import { useEffect, useRef, useState } from 'react'
import { useSesion } from '../context/useSesion'
import { EVENTO_COLA, leerTodaLaCola, quitarDePersona } from '../offline/cola'
import { cuadernoPorPersona } from '../offline/datosCola'
import '../estilos-sesion.css'

function PaginaLogin() {
  const { login, mensaje } = useSesion()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const aviso = useRef(null)
  // Cambios hechos sin señal que esperan en este celular (de esta u otra persona): se avisan antes de entrar
  const [cuaderno, setCuaderno] = useState([])
  // Email que respondió "cuenta desactivada" (con la clave correcta): sus cambios ya no se podrán enviar
  const [emailDesactivado, setEmailDesactivado] = useState('')

  useEffect(() => {
    let vigente = true
    function leer() {
      leerTodaLaCola()
        .then((cola) => { if (vigente) setCuaderno(cuadernoPorPersona(cola)) })
        .catch(() => {}) // sin almacenamiento no hay cuaderno que mostrar
    }
    leer()
    window.addEventListener(EVENTO_COLA, leer)
    return () => {
      vigente = false
      window.removeEventListener(EVENTO_COLA, leer)
    }
  }, [])

  useEffect(() => { document.title = 'Iniciar sesión | FARO' }, [])
  useEffect(() => { if (error) aviso.current?.focus() }, [error])

  async function ingresar(evento) {
    evento.preventDefault()
    if (enviando) return
    setError('')
    setEnviando(true)
    try {
      await login(email, password)
    } catch (e) {
      setEmailDesactivado(e.estado === 409 ? email.trim().toLowerCase() : '')
      let mensajeError
      if (e.estado === 401) mensajeError = 'El correo o la contraseña son incorrectos. Revisalos e intentá nuevamente.'
      else if (e.estado === 409) mensajeError = 'Tu cuenta está desactivada. Consultá al encargado del corralón.'
      else if (e.estado === 400) mensajeError = 'Revisá los datos ingresados.'
      else if (e.estado) mensajeError = 'No pudimos iniciar sesión. Intentá nuevamente en unos minutos.'
      else if (e instanceof TypeError) mensajeError = 'No pudimos conectar con FARO. Revisá tu conexión e intentá nuevamente.'
      else mensajeError = e.message
      setError(mensajeError)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pantalla-sesion">
      <header className="barra-superior">
        <div className="marca">
          <img src="/logo-faro.png" alt="" className="marca-logo" width="40" height="40" />
          <div><span className="marca-nombre">FARO</span><span className="marca-lugar">Estación General Paz</span></div>
        </div>
      </header>
      <main className="acceso-layout">
        <section className="acceso-presentacion" aria-labelledby="titulo-presentacion">
          <img src="/logo-faro.png" alt="" width="104" height="104" />
          <p className="sobre-titulo">MUNICIPALIDAD DE ESTACIÓN GENERAL PAZ</p>
          <h2 id="titulo-presentacion">Gestión del mantenimiento municipal</h2>
          <p>Organizá los trabajos, consultá los lugares y registrá las tareas de tu cuadrilla desde un mismo espacio.</p>
          <p className="acceso-ayuda">Usá la cuenta que te asignó el municipio. Si necesitás acceso, consultá al encargado del corralón.</p>
        </section>
        <section className="panel acceso-panel" aria-labelledby="titulo-login">
          <p className="sobre-titulo">ACCESO AL SISTEMA</p>
          <h1 id="titulo-login">Iniciar sesión</h1>
          <p>Ingresá con tu correo y contraseña.</p>
          {mensaje && <p className="mensaje mensaje-informacion" role="status">{mensaje}</p>}
          {error && <p ref={aviso} tabIndex={-1} className="mensaje mensaje-error" role="alert">{error}</p>}
          {cuaderno.length > 0 && <section className="mensaje mensaje-informacion aviso-cuaderno-ingreso" aria-labelledby="titulo-cuaderno-ingreso">
            <strong id="titulo-cuaderno-ingreso">Hay cambios guardados en este celular</strong>
            <ul>
              {cuaderno.map((persona) => {
                const desactivada = Boolean(persona.usuarioEmail) && persona.usuarioEmail.toLowerCase() === emailDesactivado
                const uno = persona.cantidad === 1
                return (
                  <li key={persona.usuarioId}>
                    {uno ? '1 cambio' : `${persona.cantidad} cambios`} de {persona.usuarioNombre}:{' '}
                    {desactivada ? `esta cuenta está desactivada, así que ya no ${uno ? 'se va' : 'se van'} a poder enviar.`
                      : `${uno ? 'se envía solo' : 'se envían solos'} cuando esa persona vuelva a entrar.`}
                    {desactivada && <button type="button" className="boton boton-secundario"
                      onClick={() => quitarDePersona(persona.usuarioId).catch(() => {})}>
                      {uno ? 'Descartar este cambio' : 'Descartar estos cambios'}
                    </button>}
                  </li>
                )
              })}
            </ul>
          </section>}
          <form onSubmit={ingresar} aria-busy={enviando}>
            <div className="campo">
              <label htmlFor="correo-login">Correo electrónico</label>
              <input id="correo-login" name="email" type="email" autoComplete="username" inputMode="email"
                required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} disabled={enviando} />
            </div>
            <div className="campo">
              <label htmlFor="clave-login">Contraseña</label>
              <div className="acceso-clave">
                <input id="clave-login" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password"
                  required value={password} onChange={(e) => setPassword(e.target.value)} disabled={enviando} />
                <button type="button" className="boton boton-secundario" aria-controls="clave-login"
                  aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}
                  onClick={() => setVisible((anterior) => !anterior)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            <button className="boton boton-primario acceso-ingresar" type="submit" disabled={enviando}>
              {enviando && <span className="indicador-carga" aria-hidden="true" />}
              {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>
        </section>
      </main>
      <footer className="acceso-pie">FARO · Municipalidad de Estación General Paz · Córdoba, Argentina</footer>
    </div>
  )
}

export default PaginaLogin
