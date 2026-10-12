// Textos y agrupaciones de la Ficha Histórica del Lugar.
// Son funciones puras: reciben los datos del backend y devuelven lo que se muestra. No tocan la pantalla.
import { ORIGENES, PRIORIDADES, TIPOS_TRABAJO, etiqueta } from './ordenesTrabajo.js'

// Los tipos de lugar, con el texto que ve el usuario
const NOMBRES_TIPO_LUGAR = {
  ESPACIO_VERDE: 'Espacio verde',
  CALLE: 'Calle',
  LUMINARIA: 'Luminaria',
}

export function nombreTipoLugar(tipo) {
  return NOMBRES_TIPO_LUGAR[tipo] ?? tipo
}

// "1 orden" / "3 órdenes": elige singular o plural según la cantidad
export function contar(cantidad, singular, plural) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}

// Título corto de cada evento de la línea de tiempo
export function tituloEvento(evento) {
  switch (evento.tipo) {
    case 'ORDEN_CREADA':
      return 'Se registró la orden'
    case 'CUADRILLA_ASIGNADA':
      return `Se asignó a ${evento.cuadrilla}`
    case 'CUADRILLA_REASIGNADA':
      return `Se reasignó a ${evento.cuadrilla}`
    case 'CAMBIO_ESTADO':
      return `Pasó a ${evento.estadoNuevo}`
    default:
      return 'Evento'
  }
}

// Detalle de cada evento: qué datos tenía la orden al crearse, qué cuadrilla la tenía antes
// (en una reasignación), o de qué estado a qué estado pasó
export function detalleEvento(evento) {
  if (evento.tipo === 'ORDEN_CREADA') {
    return [
      etiqueta(TIPOS_TRABAJO, evento.tipoTrabajo),
      etiqueta(ORIGENES, evento.origen),
      `Prioridad ${etiqueta(PRIORIDADES, evento.prioridad).toLowerCase()}`,
    ].join(' · ')
  }
  // En una reasignación el estado no cambia (sería "De En curso a En curso"): lo que importa es quién la tenía
  if (evento.tipo === 'CUADRILLA_REASIGNADA') {
    return evento.cuadrillaAnterior ? `Antes la tenía ${evento.cuadrillaAnterior}` : ''
  }
  if (evento.estadoAnterior && evento.estadoNuevo) {
    return `De ${evento.estadoAnterior} a ${evento.estadoNuevo}`
  }
  return ''
}

// Las opciones para filtrar la línea de tiempo por el estado de las órdenes
export const VISTAS_HISTORIA = [
  { valor: 'todas', etiqueta: 'Todos' },
  { valor: 'abiertas', etiqueta: 'Abiertos' },
  { valor: 'cerradas', etiqueta: 'Cerrados' },
]

// Deja solo los eventos de las órdenes abiertas o de las cerradas ("todas" no filtra).
// Una orden está cerrada si alguno de sus eventos la pasó a un estado de cierre (Finalizada, Cancelada):
// desde un estado de cierre no se puede salir, así que no hace falta mirar el orden de los eventos.
// (Una orden cerrada antes de que existiera la bitácora no tiene ese evento: se muestra como abierta.)
export function filtrarPorVista(eventos, vista) {
  if (vista === 'todas') return eventos
  const cerradas = new Set(eventos.filter((evento) => evento.cierre).map((evento) => evento.ordenId))
  return eventos.filter((evento) => (vista === 'cerradas') === cerradas.has(evento.ordenId))
}

// A qué orden le pasó: "OT #12 · Podar el fresno"
export function ordenDelEvento(evento) {
  return `OT #${evento.ordenId} · ${evento.ordenDescripcion}`
}

// "2026-10-07T19:04:12.82164" → "19:04"
export function horaEvento(fechaIso) {
  return fechaIso?.slice(11, 16) ?? ''
}

// "2026-10-07" → "7 de octubre de 2026"
export function nombreDia(dia) {
  const [anio, mes, numero] = dia.split('-').map(Number)
  return new Date(anio, mes - 1, numero).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Agrupa los eventos por día, sin cambiar su orden (el backend ya los manda del más nuevo al más viejo).
// [{ dia: '2026-10-07', eventos: [...] }, { dia: '2026-10-06', eventos: [...] }]
export function agruparPorDia(eventos) {
  const grupos = []
  for (const evento of eventos) {
    const dia = evento.fecha.slice(0, 10)
    const ultimo = grupos.at(-1)
    if (ultimo?.dia === dia) {
      ultimo.eventos.push(evento)
    } else {
      grupos.push({ dia, eventos: [evento] })
    }
  }
  return grupos
}