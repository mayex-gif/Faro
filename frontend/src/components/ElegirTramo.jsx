import { useEffect, useRef } from 'react'
import Icono from './Icono'
import { pedidoDeTramo, textoDePunto } from '../utils/tramos'

// "Nueva OT acá" en una calle: antes del formulario de OT, se elige dónde es el trabajo.
// Ocupa el lugar de la ficha (compu) o sube desde abajo (celular), como "Agregar lugar".
// La página guarda los toques y el mapa los dibuja; este panel solo explica y ofrece los botones.
// Props:
// - calle: el lugar CALLE ({ id, nombre, ubicacion })
// - cruces: sus esquinas (utils/tramos.js → crucesDe)
// - modo: 'elegir' (¿toda la calle o un tramo?) o 'tramo' (se están marcando los dos toques)
// - toques: [{ distancia, esquina }] (0, 1 o 2)
// - onTodaLaCalle(), onUnTramo(), onVolver(): cambiar de modo
// - onDeshacer(), onElegirOtraVez(): borrar el último toque o todos
// - onSeguir(pedido): pedido = { tramo, calleEntre1, calleEntre2, texto } (utils/tramos.js → pedidoDeTramo)
// - onCancelar(): volver a la ficha de la calle
function ElegirTramo({ calle, cruces, modo, toques, onTodaLaCalle, onUnTramo, onVolver, onDeshacer, onElegirOtraVez, onSeguir, onCancelar }) {
  const titulo = useRef(null)
  const pedido = pedidoDeTramo(calle, cruces, toques)
  const [inicio, fin] = toques
  const instruccion = !inicio
    ? 'Tocá en la calle dónde empieza el trabajo.'
    : !fin ? 'Ahora tocá dónde termina el trabajo.' : 'Listo. Si está bien, apretá Seguir.'

  // Al abrir y al cambiar de modo, el foco va al título (teclado y lector de pantalla)
  useEffect(() => {
    titulo.current?.focus()
  }, [modo])

  return (
    <section className={`panel-lugar elegir-tramo elegir-tramo-${modo}`} aria-labelledby="titulo-elegir-tramo">
      <div className="panel-lugar-cabecera">
        <div className="panel-lugar-datos">
          <p className="panel-lugar-tipo">Nueva OT en una calle</p>
          <h2 id="titulo-elegir-tramo" ref={titulo} tabIndex={-1}>{calle.nombre}</h2>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCancelar} aria-label={`Cancelar la nueva OT en ${calle.nombre}`}>
          <Icono nombre="cerrar" />
        </button>
      </div>

      {modo === 'elegir' ? (
        <div className="panel-lugar-seccion">
          <h3>¿Dónde es el trabajo?</h3>
          <div className="opciones-tramo">
            <button type="button" className="opcion-tramo" onClick={onTodaLaCalle}>
              <Icono nombre="calle" />
              <span><strong>Toda la calle</strong><span>La OT es para toda {calle.nombre}.</span></span>
            </button>
            <button type="button" className="opcion-tramo" onClick={onUnTramo}>
              <Icono nombre="lugar" />
              <span><strong>Un tramo</strong><span>Marcás en el mapa desde dónde hasta dónde (puede ser desde la mitad de una cuadra).</span></span>
            </button>
          </div>
        </div>
      ) : (
        <div className="panel-lugar-seccion">
          <h3>Marcá el tramo en el mapa</h3>
          <p className="paso-agregar"><Icono nombre="lugar" />{instruccion}</p>
          <p className="ayuda-campo">
            {cruces.length > 0
              ? 'Los puntos con nombre son las esquinas. Si tocás cerca de una esquina, el tramo se pega a ella.'
              : 'Esta calle no cruza con ninguna calle cargada: el tramo se marca igual, sin esquinas.'}
          </p>
          <dl className="ubicacion-elegida tramo-elegido" aria-live="polite">
            <div><dt>Desde</dt><dd>{inicio ? textoDePunto(calle, cruces, inicio.distancia) : '—'}</dd></div>
            <div><dt>Hasta</dt><dd>{fin ? textoDePunto(calle, cruces, fin.distancia) : '—'}</dd></div>
            {pedido && <div className="tramo-elegido-resumen"><dt className="solo-lectores">Tramo</dt><dd>{pedido.texto}</dd></div>}
          </dl>
          <div className="botones botones-tramo">
            <button type="button" className="boton boton-secundario" onClick={onDeshacer} disabled={toques.length === 0}>Deshacer</button>
            <button type="button" className="boton boton-secundario" onClick={onElegirOtraVez} disabled={toques.length === 0}>Elegir otra vez</button>
            <button type="button" className="boton boton-secundario" onClick={onVolver}>
              <Icono nombre="volver" />Volver
            </button>
            <button type="button" className="boton boton-primario" onClick={() => onSeguir(pedido)} disabled={!pedido}>
              Seguir<Icono nombre="siguiente" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default ElegirTramo
