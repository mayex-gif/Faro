// Iconos decorativos: las acciones siempre tienen también una etiqueta de texto.
const trazos = {
  lugar: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  infraestructura: 'M3 21h18 M5 21V9h6v12 M11 21V3h8v18 M8 12v1 M8 16v1 M15 7v1 M15 11v1 M15 15v1',
  agregar: 'M12 5v14 M5 12h14',
  guardar: 'M20 6 9 17l-5-5',
  editar: 'm16 3 5 5-12 12-6 1 1-6Z M14 5l5 5',
  borrar: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  cuadrilla: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    orden: 'M9 3h6v3H9Z M9 4.5H6V21h12V4.5h-3 M9 11h6 M9 15h6 M9 19h3',
}

function Icono({ nombre, className = '' }) {
  return (
    <svg className={`icono ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      <path d={trazos[nombre]} />
    </svg>
  )
}

export default Icono
