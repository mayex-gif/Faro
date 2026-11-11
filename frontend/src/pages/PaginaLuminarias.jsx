import PaginaInfraestructura from './PaginaInfraestructura'

// Más → Luminarias: el alumbrado público tiene su propia sección (alta, edición y baja de luminarias,
// con "Todavía no está instalada"). Es la misma pantalla que Infraestructura, mostrando solo luminarias.
function PaginaLuminarias(props) {
  return <PaginaInfraestructura {...props} categoria="luminarias" />
}

export default PaginaLuminarias
