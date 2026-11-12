import { useEffect, useState } from 'react'
import { buscarCalles, textoDeLaCalle } from '../utils/calles'
import { subtituloLugar } from '../utils/listaLugares'
import { colorDelResumen } from '../utils/mapa'
import Icono from './Icono'

// La muestra de la calle en las filas: un tramo con borde blanco, del mismo color que en el mapa.
function MuestraCalle({ color }) {
  return <span className="muestra-calle" aria-hidden="true"><span style={{ background: color }} /></span>
}

// Una lista de calles (con trabajos o sin trabajos). Tocar una la elige en el mapa.
function ListaDeCalles({ id, titulo, ayuda, calles, vacio, modoColor, lugarActivoId, onElegir }) {
  return (
    <section className="luminarias-seccion" aria-labelledby={id}>
      <h2 id={id}>{titulo} <span className="luminarias-cantidad">({calles.length})</span></h2>
      {ayuda && <p className="luminarias-ayuda">{ayuda}</p>}
      {calles.length === 0 ? (
        <p className="luminarias-vacio">{vacio}</p>
      ) : (
        <ul className="filas-lugares">
          {calles.map((resumen) => {
            const { lugar } = resumen
            const activo = lugar.id === lugarActivoId
            return (
              <li key={lugar.id}>
                <button type="button" id={`fila-calle-${lugar.id}`} aria-pressed={activo}
                  className={activo ? 'fila-lugar fila-lugar-activa' : 'fila-lugar'} onClick={() => onElegir(lugar.id)}>
                  <MuestraCalle color={colorDelResumen(resumen, modoColor)} />
                  <span className="fila-lugar-texto">
                    <strong>{lugar.nombre}</strong>
                    <span>{subtituloLugar(resumen)}</span>
                    {resumen.principal && <span>{textoDeLaCalle(resumen)}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// Columna de la izquierda en la pestaña Calles: cuántas calles hay, cuántas tienen trabajos abiertos
// y las dos listas (con trabajos, las más urgentes arriba; sin trabajos, por nombre). Se puede buscar una calle.
// Props:
// - calles: resúmenes de las calles (utils/calles.js → callesDe), ya ordenados
// - totales: resumirCalles(calles) → { total, conTrabajos, sinTrabajos, fueraDeServicio }
// - modoColor: el mismo del mapa ('prioridad' o 'estado'), para que la muestra coincida con la línea
// - lugarActivoId, onElegir(lugarId): como en la lista de lugares
function PanelCalles({ calles, totales, modoColor, lugarActivoId, onElegir }) {
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (lugarActivoId == null) return
    document.getElementById(`fila-calle-${lugarActivoId}`)?.scrollIntoView({ block: 'nearest' })
  }, [lugarActivoId])

  const encontradas = buscarCalles(calles, busqueda)
  const conTrabajos = encontradas.filter((resumen) => resumen.principal)
  const sinTrabajos = encontradas.filter((resumen) => !resumen.principal)
  const buscando = busqueda.trim() !== ''

  return (
    <section className="columna-lugares panel-luminarias panel-calles" aria-labelledby="titulo-calles">
      <div className="lugares-encabezado">
        <div className="lugares-titulo">
          <h1 id="titulo-calles">Calles</h1>
          <span>{totales.total} {totales.total === 1 ? 'cargada' : 'cargadas'}</span>
        </div>

        <ul className="luminarias-conteos calles-conteos" aria-label="Cantidad de calles">
          <li><strong>{totales.conTrabajos}</strong><span>Con trabajos abiertos</span></li>
          <li><strong>{totales.sinTrabajos}</strong><span>Sin trabajos</span></li>
          {totales.fueraDeServicio > 0 && <li className="calles-conteo-falla"><strong>{totales.fueraDeServicio}</strong><span>Fuera de servicio</span></li>}
        </ul>

        <div className="campo calles-buscar">
          <label htmlFor="buscar-calle" className="solo-lectores">Buscar una calle</label>
          <Icono nombre="buscar" />
          <input id="buscar-calle" type="search" placeholder="Buscar una calle" value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)} />
        </div>
        {buscando && <p className="luminarias-ayuda" role="status">
          {encontradas.length === 0 ? 'Ninguna calle coincide con la búsqueda.' : `${encontradas.length} de ${calles.length} calles`}
        </p>}
      </div>

      <div className="luminarias-listas">
        {calles.length === 0 ? (
          <section className="luminarias-seccion">
            <p className="luminarias-vacio">Todavía no hay calles cargadas. Tocá "Agregar calle" y marcá su recorrido en el mapa.</p>
          </section>
        ) : (
          <>
            <ListaDeCalles id="titulo-calles-con-trabajos" titulo="Con trabajos abiertos" calles={conTrabajos}
              ayuda="Las más urgentes, arriba. El color es el de la OT más urgente de cada calle."
              vacio={buscando ? 'Ninguna de las calles encontradas tiene trabajos abiertos.' : 'Ninguna calle tiene trabajos abiertos.'}
              modoColor={modoColor} lugarActivoId={lugarActivoId} onElegir={onElegir} />
            <ListaDeCalles id="titulo-calles-sin-trabajos" titulo="Sin trabajos" calles={sinTrabajos}
              vacio={buscando ? 'Todas las calles encontradas tienen trabajos abiertos.' : 'Todas las calles tienen trabajos abiertos.'}
              modoColor={modoColor} lugarActivoId={lugarActivoId} onElegir={onElegir} />
          </>
        )}
      </div>
    </section>
  )
}

export default PanelCalles
