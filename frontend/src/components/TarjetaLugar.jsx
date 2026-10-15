import Icono from './Icono'
import { textoTrabajos } from '../utils/listaLugares'
import { etiquetaTipoLugar, textoEstadoOperativo } from '../utils/lugares'

// Tarjeta que sube desde abajo en el celular al tocar un lugar (pantalla Mapa, propuesta A).
// Es el resumen del lugar; "Ver ficha e historia" abre la ficha completa (PanelLugar) encima del mapa.
// Props:
// - resumen: { lugar, ordenes } (ordenes = las abiertas)
// - onCerrar(): cerrar la tarjeta
// - onVerFicha(): abrir la ficha completa
// - onNuevaOrden(lugarId): "+ Nueva OT acá"
function TarjetaLugar({ resumen, onCerrar, onVerFicha, onNuevaOrden }) {
  const { lugar, ordenes } = resumen

  return (
    <section className="tarjeta-lugar" aria-labelledby="titulo-tarjeta-lugar">
      <span className="tarjeta-lugar-agarre" aria-hidden="true" />
      <div className="tarjeta-lugar-cabecera">
        <div className="panel-lugar-datos">
          <p className="panel-lugar-tipo">{etiquetaTipoLugar(lugar.tipo)} · {textoEstadoOperativo(lugar.estadoOperativo)}</p>
          <h2 id="titulo-tarjeta-lugar">{lugar.nombre}</h2>
          <p className="tarjeta-lugar-trabajos">{textoTrabajos(ordenes)}</p>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label={`Cerrar ${lugar.nombre}`}>
          <Icono nombre="cerrar" />
        </button>
      </div>
      <div className="tarjeta-lugar-botones">
        <button type="button" className="boton boton-primario" onClick={() => onNuevaOrden(lugar.id)}>
          <Icono nombre="agregar" />Nueva OT acá
        </button>
        <button type="button" className="boton boton-secundario" onClick={onVerFicha}>
          Ver ficha e historia
        </button>
      </div>
    </section>
  )
}

export default TarjetaLugar
