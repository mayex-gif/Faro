// "Ver los datos en una tabla": los mismos números del gráfico, para teclado y lector de pantalla
// (un dibujo SVG no se puede recorrer). columnas: encabezados; filas: [{ clave, celdas: [primera, ...resto] }].
// La primera celda de cada fila es el encabezado de esa fila.
function TablaDatosGrafico({ titulo, columnas, filas }) {
  return (
    <details className="datos-grafico">
      <summary>Ver los datos en una tabla</summary>
      <div className="tabla-contenedor" tabIndex={0}>
        <table className="tabla tabla-evolucion">
          <caption className="solo-lectores">{titulo}</caption>
          <thead>
            <tr>{columnas.map((columna) => <th key={columna} scope="col">{columna}</th>)}</tr>
          </thead>
          <tbody>
            {filas.map(({ clave, celdas: [primera, ...resto] }) => (
              <tr key={clave}>
                <th scope="row">{primera}</th>
                {resto.map((celda, indice) => <td key={indice}>{celda}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export default TablaDatosGrafico
