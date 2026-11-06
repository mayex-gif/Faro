// Ranking de barras horizontales: nombre, barra proporcional al mayor y cantidad escrita.
// Es una lista común (no un dibujo): un lector de pantalla lee "Corte de pasto, 15 órdenes, 31 % del total".
// filas: las arma filasBarras() en utils/reportes.js. Si una fila trae color (ej. el del estado), se muestra
// un punto de ese color al lado del nombre; la barra siempre es del mismo tono, porque mide cantidad.
function BarrasHorizontales({ filas, unidad = ['orden', 'órdenes'], mensajeVacio }) {
  if (filas.length === 0) return <p className="barras-vacio">{mensajeVacio}</p>

  return (
    <ul className="barras">
      {filas.map((fila) => (
        <li key={fila.nombre} className="barra-fila">
          <span className="barra-nombre">
            {fila.color && <span className="barra-punto" style={{ background: fila.color }} aria-hidden="true" />}
            {fila.nombre}
          </span>
          <span className="barra-pista" aria-hidden="true">
            <span className="barra-relleno" style={{ width: `${Math.max(fila.ancho, fila.valor > 0 ? 1.5 : 0)}%` }} />
          </span>
          <span className="barra-valor">
            <strong>{fila.valor}</strong>
            <span className="solo-lectores"> {fila.valor === 1 ? unidad[0] : unidad[1]},</span>
            <span className="barra-parte"> {fila.parte}%<span className="solo-lectores"> del total</span></span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default BarrasHorizontales
