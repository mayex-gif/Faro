import { useEffect, useId, useRef, useState } from 'react'
import { borrarComentario, listarComentarios, publicarComentario } from '../api/comentarios'
import { useSesion } from '../context/useSesion'
import { nuevoNumero } from '../offline/datosCola'
import {
  MAX_TEXTO, contadorTexto, descripcionFoto, fechaComentario, fotosQueQuedan, mensajeDeError, puedeComentar,
  sacarDelMuro, sumarAlMuro, textoCantidad, validarComentario,
} from '../utils/comentarios'
import { achicarFoto } from '../utils/fotos'
import { NOMBRES_ROL } from '../utils/permisos'
import FotoProtegida from './FotoProtegida'
import Icono from './Icono'
import VisorFotos from './VisorFotos'
import '../estilos-comentarios.css'

// El muro "Comentarios y fotos" de una OT (tarjetas 16 + 21): arriba se escribe, abajo se lee.
// Lo usan Mis tareas (dentro de cada tarjeta y después de Finalizar) y Trabajos (en una hoja).
// Las reglas (quién comenta, límites) están en utils/comentarios.js; el backend las vuelve a revisar.
// Props: orden (la OT), titulo (opcional, para el aviso después de Finalizar),
//        mostrarTitulo (false dentro de la tarjeta de tarea, que ya dice "Comentarios y fotos" en su desplegable)
function PanelComentarios({ orden, titulo, mostrarTitulo = true }) {
  const { usuario } = useSesion()
  const id = useId()
  const [comentarios, setComentarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [texto, setTexto] = useState('')
  const [fotos, setFotos] = useState([]) // [{ clave, blob, vista }] — ya achicadas
  const [preparandoFotos, setPreparandoFotos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(null)
  const [borrando, setBorrando] = useState(null)
  const [visor, setVisor] = useState(null) // { comentario, indice }
  const [vuelta, setVuelta] = useState(0) // sube para volver a cargar el muro
  // Número de comanda del comentario que se está escribiendo. Se mantiene si falla el envío:
  // así, si en realidad había llegado, el reintento no lo duplica.
  const numero = useRef(nuevoNumero())
  const inputCamara = useRef(null)
  const inputGaleria = useRef(null)
  const vistas = useRef([])

  const permitido = orden?.id != null && puedeComentar(usuario, orden)

  useEffect(() => {
    if (!permitido) return undefined
    let vigente = true
    listarComentarios(orden.id)
      .then((muro) => { if (vigente) setComentarios(muro) })
      .catch((e) => { if (vigente) setErrorCarga(mensajeDeError(e)) })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [orden?.id, permitido, vuelta])

  // Al salir de la pantalla, se liberan las vistas previas de las fotos elegidas
  useEffect(() => () => vistas.current.forEach((vista) => URL.revokeObjectURL(vista)), [])

  if (!permitido) return null

  function recargar() {
    setCargando(true)
    setErrorCarga('')
    setVuelta((v) => v + 1)
  }

  async function agregarFotos(evento) {
    const elegidas = [...evento.target.files]
    evento.target.value = '' // permite volver a elegir la misma foto
    if (elegidas.length === 0) return
    const lugar = fotosQueQuedan(fotos.length)
    const entran = elegidas.slice(0, lugar)
    setError('')
    setAviso(elegidas.length > lugar ? `Se pueden agregar hasta 5 fotos por comentario: se agregaron ${entran.length}.` : '')
    setPreparandoFotos(true)
    try {
      const listas = []
      for (const archivo of entran) {
        const blob = await achicarFoto(archivo)
        const vista = URL.createObjectURL(blob)
        vistas.current.push(vista)
        listas.push({ clave: nuevoNumero(), blob, vista })
      }
      setFotos((anteriores) => [...anteriores, ...listas])
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setPreparandoFotos(false)
    }
  }

  function quitarFoto(clave) {
    setFotos((anteriores) => anteriores.filter((foto) => foto.clave !== clave))
  }

  async function publicar(evento) {
    evento.preventDefault()
    const problema = validarComentario({ texto, fotos })
    setAviso('')
    if (problema) {
      setError(problema)
      return
    }
    setError('')
    setEnviando(true)
    try {
      const nuevo = await publicarComentario(orden.id, numero.current, {
        texto, fotos: fotos.map((foto) => foto.blob), hechoEn: new Date(),
      })
      setComentarios((muro) => sumarAlMuro(muro, nuevo))
      setTexto('')
      setFotos([])
      numero.current = nuevoNumero() // el próximo comentario es otra comanda
      setAviso('Comentario publicado.')
    } catch (e) {
      setError(mensajeDeError(e)) // lo escrito y las fotos se conservan para reintentar
    } finally {
      setEnviando(false)
    }
  }

  async function borrar(comentario) {
    setBorrando(comentario.id)
    setError('')
    try {
      await borrarComentario(comentario.id)
      setComentarios((muro) => sacarDelMuro(muro, comentario.id))
      setAviso('Comentario borrado.')
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setBorrando(null)
      setConfirmandoBorrar(null)
    }
  }

  const ocupado = enviando || preparandoFotos

  return (
    <section className="panel-comentarios" aria-labelledby={`${id}-titulo`}>
      <div className="comentarios-titulo">
        <h3 id={`${id}-titulo`} className={mostrarTitulo ? '' : 'solo-lectores'}>
          {mostrarTitulo && <Icono nombre="comentario" />}{titulo ?? 'Comentarios y fotos'}
        </h3>
        {!cargando && !errorCarga && <span className="contador">{textoCantidad(comentarios.length)}</span>}
      </div>

      <form className="comentarios-formulario" onSubmit={publicar} aria-busy={ocupado}>
        <div className="campo">
          <label htmlFor={`${id}-texto`}>Comentario</label>
          <textarea id={`${id}-texto`} value={texto} rows={3} maxLength={MAX_TEXTO} disabled={enviando}
            placeholder="Ej: Se cambió la lámpara. Falta pintar el poste."
            aria-describedby={`${id}-contador`} onChange={(evento) => setTexto(evento.target.value)} />
          <p id={`${id}-contador`} className="ayuda-campo">{contadorTexto(texto)} · Podés mandar solo fotos.</p>
        </div>

        {fotos.length > 0 && (
          <ul className="comentarios-elegidas" aria-label="Fotos para agregar">
            {fotos.map((foto, indice) => (
              <li key={foto.clave}>
                <img src={foto.vista} alt={`Foto ${indice + 1} para agregar`} />
                <button type="button" className="boton-quitar-foto" onClick={() => quitarFoto(foto.clave)}
                  disabled={enviando} aria-label={`Quitar la foto ${indice + 1}`}>
                  <Icono nombre="cerrar" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Dos entradas: "Sacar foto" abre la cámara del celular; "Elegir fotos", la galería (en la compu, el explorador) */}
        <input ref={inputCamara} type="file" accept="image/*" capture="environment" hidden onChange={agregarFotos} />
        <input ref={inputGaleria} type="file" accept="image/*" multiple hidden onChange={agregarFotos} />
        <div className="comentarios-acciones">
          <button type="button" className="boton boton-secundario" disabled={ocupado || fotosQueQuedan(fotos.length) === 0}
            onClick={() => inputCamara.current?.click()}>
            <Icono nombre="camara" />Sacar foto
          </button>
          <button type="button" className="boton boton-secundario" disabled={ocupado || fotosQueQuedan(fotos.length) === 0}
            onClick={() => inputGaleria.current?.click()}>
            <Icono nombre="foto" />Elegir fotos
          </button>
          <button type="submit" className="boton boton-primario" disabled={ocupado}>
            <Icono nombre="guardar" />{enviando ? 'Publicando…' : preparandoFotos ? 'Preparando fotos…' : 'Publicar'}
          </button>
        </div>
        <p className="ayuda-campo">Hasta 5 fotos por comentario. Se achican antes de enviarlas.</p>

        <div aria-live="polite" aria-atomic="true">
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          {aviso && <p className="mensaje mensaje-exito">{aviso}</p>}
        </div>
      </form>

      {cargando ? (
        <p className="comentarios-estado" role="status"><span className="indicador-carga" aria-hidden="true" />Cargando comentarios…</p>
      ) : errorCarga ? (
        <div className="mensaje mensaje-error" role="alert">
          <p>{errorCarga}</p>
          <button type="button" className="boton boton-secundario" onClick={recargar}>Volver a cargar</button>
        </div>
      ) : comentarios.length === 0 ? (
        <p className="comentarios-estado">Todavía no hay comentarios. Contá cómo va el trabajo o sumá fotos.</p>
      ) : (
        <ol className="comentarios-lista">
          {comentarios.map((comentario) => (
            <li key={comentario.id} className="comentario">
              <p className="comentario-autor">
                <strong>{comentario.autorNombre}</strong>
                <span className="comentario-rol">{NOMBRES_ROL[comentario.autorRol] ?? ''}</span>
                <time dateTime={comentario.hechoEn}>{fechaComentario(comentario.hechoEn)}</time>
              </p>
              {comentario.texto && <p className="comentario-texto">{comentario.texto}</p>}
              {comentario.fotos.length > 0 && (
                <ul className="comentario-fotos">
                  {comentario.fotos.map((foto, indice) => (
                    <li key={foto.id}>
                      <button type="button" className="boton-foto" onClick={() => setVisor({ comentario, indice })}
                        aria-label={`Ver en grande: ${descripcionFoto(comentario, indice)}`}>
                        <FotoProtegida fotoId={foto.id} descripcion={descripcionFoto(comentario, indice)} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {comentario.puedeBorrar && (confirmandoBorrar === comentario.id ? (
                <div className="comentario-confirmar" role="group" aria-label="Confirmar el borrado">
                  <span>¿Borrar este comentario{comentario.fotos.length > 0 ? ' y sus fotos' : ''}?</span>
                  <button type="button" className="boton boton-borrar" disabled={borrando === comentario.id}
                    onClick={() => borrar(comentario)}>
                    {borrando === comentario.id ? 'Borrando…' : 'Sí, borrar'}
                  </button>
                  <button type="button" className="boton boton-secundario" disabled={borrando === comentario.id}
                    onClick={() => setConfirmandoBorrar(null)}>Cancelar</button>
                </div>
              ) : (
                <button type="button" className="boton-texto comentario-borrar" onClick={() => setConfirmandoBorrar(comentario.id)}
                  aria-label={`Borrar el comentario de ${comentario.autorNombre}`}>
                  <Icono nombre="borrar" />Borrar
                </button>
              ))}
            </li>
          ))}
        </ol>
      )}

      {visor && <VisorFotos comentario={visor.comentario} indiceInicial={visor.indice} onCerrar={() => setVisor(null)} />}
    </section>
  )
}

export default PanelComentarios
