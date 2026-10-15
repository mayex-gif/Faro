import { FILTROS_TIPO, alternarTipo } from '../utils/listaLugares'

// Los botoncitos para filtrar lugares: "Con trabajos abiertos", Luminarias, Espacios verdes y Calles.
// Los usan la lista de lugares y, en el celular, la fila que va arriba del mapa.
// aria-pressed: el lector de pantalla anuncia si cada botoncito está prendido o apagado.
// Props: filtros ({ conTrabajos, tipos }), onCambiar(filtrosNuevos), className (clase extra del grupo)
function BotoncitosLugares({ filtros, onCambiar, className = '' }) {
  return (
    <div className={`botoncitos ${className}`} role="group" aria-label="Filtrar lugares">
      <button type="button" className="botoncito" aria-pressed={filtros.conTrabajos}
        onClick={() => onCambiar({ ...filtros, conTrabajos: !filtros.conTrabajos })}>
        Con trabajos abiertos
      </button>
      {FILTROS_TIPO.map((filtro) => (
        <button key={filtro.valor} type="button" className="botoncito" aria-pressed={filtros.tipos.includes(filtro.valor)}
          onClick={() => onCambiar(alternarTipo(filtros, filtro.valor))}>
          {filtro.etiqueta}
        </button>
      ))}
    </div>
  )
}

export default BotoncitosLugares
