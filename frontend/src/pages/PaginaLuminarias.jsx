import PaginaInfraestructura from './PaginaInfraestructura'

// Más → Luminarias: el alumbrado público tiene su propia sección (alta, edición y baja de luminarias,
// incluidas las luminarias a futuro). Es la misma pantalla que Infraestructura, mostrando solo luminarias.
function PaginaLuminarias(props) {
  return <PaginaInfraestructura {...props} categoria="luminarias" />
}

export default PaginaLuminarias
