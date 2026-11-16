import { useEffect, useState } from 'react'
import { buscarAuditoria } from '../api/auditoria'
import { listarEstados } from '../api/estadosOrden'
import { listarPuntos } from '../api/infraestructura'
import { listarReglas } from '../api/mantenimiento'
import FiltrosAuditoria from '../components/FiltrosAuditoria'
import TablaAuditoria from '../components/TablaAuditoria'
import Icono from '../components/Icono'
import { FILTROS_VACIOS, TAMANIO_PAGINA, parametrosDesde, rangoValido } from '../utils/auditoria'
import '../estilos-auditoria.css'

// Trazabilidad de los registros clave del sistema (quién creó, modificó o eliminó qué y cuándo).
// La ve solamente el encargado del corralón (utils/permisos.js → puedeVerAuditoria); el backend
// valida lo mismo y responde 403 para cualquier otro rol (ver AuditoriaController.java).
//
// A diferencia de Infraestructura y Órdenes (una lista completa que se filtra en el navegador), acá el
// listado está paginado por el backend: cada búsqueda o cambio de página es un pedido nuevo. "cargando" se
// prende al disparar el pedido (desde "Buscar", "Limpiar" o los botones de página) y el efecto solo trae
// los datos para la combinación vigente de filtros aplicados + página, sin disparar un setState por su cuenta.
function PaginaAuditoria() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_VACIOS)
  const [pagina, setPagina] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [relaciones, setRelaciones] = useState({})
  const [paginaDestino, setPaginaDestino] = useState('')

  useEffect(() => {
    Promise.allSettled([listarEstados(), listarPuntos(), listarReglas()]).then(([estados, lugares, reglas]) => {
      const mapa = (resultado, nombre) => resultado.status === 'fulfilled'
        ? new Map(resultado.value.map((registro) => [String(registro.id), registro.nombre ?? registro.titulo ?? `ID ${registro.id}`]))
        : new Map()
      const estadosMap = mapa(estados, 'estado')
      const lugaresMap = mapa(lugares, 'lugar')
      const reglasMap = mapa(reglas, 'regla')
      setRelaciones({ estado: estadosMap, estadoAnterior: estadosMap, estadoNuevo: estadosMap,
        lugar: lugaresMap, puntoInfraestructura: lugaresMap, reglaMantenimiento: reglasMap })
    })
  }, [])

  useEffect(() => {
    if (!rangoValido(filtrosAplicados)) return
    let vigente = true
    buscarAuditoria(parametrosDesde(filtrosAplicados), pagina, TAMANIO_PAGINA)
      .then((datos) => {
        if (!vigente) return
        setResultado(datos)
        setError(null)
      })
      .catch((e) => {
        if (!vigente) return
        console.error(e)
        setError('No pudimos cargar la auditoría. Revisá la conexión e intentá nuevamente.')
      })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false } // si se dispara otro pedido antes de que este termine, se ignora su resultado
  }, [filtrosAplicados, pagina])

  function buscar() {
    setCargando(true)
    setError(null)
    setPagina(0)
    // También permite repetir la misma búsqueda después de un error.
    setFiltrosAplicados({ ...filtros })
  }

  function limpiar() {
    setFiltros(FILTROS_VACIOS)
    setCargando(true)
    setError(null)
    setPagina(0)
    setFiltrosAplicados({ ...FILTROS_VACIOS })
  }

  function irAPagina(nueva) {
    setCargando(true)
    setPagina(nueva)
  }

  function saltarAPagina(evento) {
    evento.preventDefault()
    const destino = Number(paginaDestino)
    if (Number.isInteger(destino) && destino >= 1 && destino <= resultado.totalPaginas) irAPagina(destino - 1)
  }

  function reintentar() {
    setCargando(true)
    setError(null)
    // si los filtros ya estaban aplicados, cambiar el objeto (aunque tenga los mismos valores) dispara el efecto otra vez
    setFiltrosAplicados({ ...filtrosAplicados })
  }

  const registros = resultado?.registros ?? []
  const mensajeVacio = JSON.stringify(filtrosAplicados) === JSON.stringify(FILTROS_VACIOS)
    ? 'Todavía no hay movimientos registrados.'
    : 'Ningún movimiento coincide con la búsqueda.'

  return (
    <>
      <div className="encabezado-pagina">
        <p className="sobre-titulo">TRAZABILIDAD</p>
        <h1>Auditoría</h1>
        <p>Consultá quién creó, modificó o eliminó cada registro clave de FARO, y cuándo. Se guarda sola: no hay nada que cargar acá.</p>
      </div>

      <section className="panel listado" aria-labelledby="titulo-listado-auditoria" aria-busy={cargando}>
        <div className="panel-encabezado">
          <div>
            <h2 id="titulo-listado-auditoria">Movimientos</h2>
            <p>Del más reciente al más antiguo.</p>
          </div>
          {!cargando && !error && resultado && (
            <span className="contador">
              {resultado.totalRegistros === 0 ? 'Sin resultados' : `${resultado.totalRegistros} ${resultado.totalRegistros === 1 ? 'resultado' : 'resultados'}`}
            </span>
          )}
        </div>

        <FiltrosAuditoria filtros={filtros} onCambiar={setFiltros} onBuscar={buscar} onLimpiar={limpiar} buscando={cargando} />

        {error && (
          <div className="mensaje mensaje-error" role="alert">
            <div><strong>No se pudo completar la operación</strong><p>{error}</p></div>
            <button type="button" className="boton boton-secundario" onClick={reintentar}>Volver a cargar</button>
          </div>
        )}

        {cargando ? (
          <div className="estado-listado" role="status">
            <span className="indicador-carga" aria-hidden="true" />
            <p>Cargando auditoría…</p>
          </div>
        ) : !error && (
          <>
            <TablaAuditoria registros={registros} mensajeVacio={mensajeVacio} relaciones={relaciones} />
            {resultado && resultado.totalPaginas > 1 && (
              <nav className="paginacion" aria-label="Páginas de resultados">
                <button type="button" className="boton boton-secundario" disabled={resultado.primera}
                  onClick={() => irAPagina(0)} aria-label="Primera página">«</button>
                <button type="button" className="boton boton-secundario" disabled={resultado.primera}
                  onClick={() => irAPagina(pagina - 1)}>
                  <Icono nombre="volver" />Anterior
                </button>
                <span aria-live="polite">Página {resultado.pagina + 1} de {resultado.totalPaginas}</span>
                <form className="salto-pagina" onSubmit={saltarAPagina}>
                  <label htmlFor="pagina-destino">Ir a</label>
                  <input id="pagina-destino" type="number" min="1" max={resultado.totalPaginas}
                    value={paginaDestino} onChange={(e) => setPaginaDestino(e.target.value)} aria-label="Número de página" />
                  <button className="boton boton-secundario" type="submit">Ir</button>
                </form>
                <button type="button" className="boton boton-secundario" disabled={resultado.ultima}
                  onClick={() => irAPagina(pagina + 1)}>
                  Siguiente<Icono nombre="abajo" className="icono-siguiente" />
                </button>
                <button type="button" className="boton boton-secundario" disabled={resultado.ultima}
                  onClick={() => irAPagina(resultado.totalPaginas - 1)} aria-label="Última página">»</button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  )
}

export default PaginaAuditoria
