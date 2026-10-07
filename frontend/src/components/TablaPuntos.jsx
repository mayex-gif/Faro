import Icono from './Icono'

const NOMBRES_TIPO = {
  ESPACIO_VERDE: 'Espacio verde',
  CALLE: 'Calle',
  LUMINARIA: 'Luminaria',
}

function describirUbicacion(ubicacion) {
  if (!ubicacion) return 'Sin ubicación'
  switch (ubicacion.type) {
    case 'Point': {
      // Agregamos seguridad por si el backend manda mal las coordenadas
      if (!ubicacion.coordinates || ubicacion.coordinates.length < 2) return 'Ubicación inválida'
      const [longitud, latitud] = ubicacion.coordinates
      return `${latitud.toFixed(4)}, ${longitud.toFixed(4)}`
    }
    case 'LineString':
      return `Línea de ${ubicacion.coordinates?.length || 0} puntos`
    case 'Polygon':
      return 'Polígono'
    default:
      return ubicacion.type
  }
}

// 1. Agregamos mensajeVacio a las props recibidas
function TablaPuntos({ puntos, idEditando, onEditar, onEliminar, errorCarga, mensajeVacio }) {
  
  // 2. Control de seguridad: verificamos que puntos exista antes de leer .length
  if (!puntos || puntos.length === 0) {
    if (errorCarga) return null
    
    // Validamos si el vacío es por filtros o porque realmente no hay datos
    const esFiltroVacio = mensajeVacio && mensajeVacio.includes('filtros')

    return (
      <div className="estado-listado estado-vacio">
        <span className="icono-vacio"><Icono nombre="lugar" /></span>
        {/* Usamos el mensaje dinámico que manda App.jsx */}
        <h3>{mensajeVacio || 'Todavía no hay lugares registrados'}</h3>
        
        {/* Solo invitamos a registrar un lugar si NO es un filtro vacío */}
        {!esFiltroVacio && (
          <>
            <p>Registrá el primer lugar con el formulario de arriba.<br />Después vas a poder consultar y actualizar sus datos acá.</p>
            <a className="enlace" href="#nombre">Registrar el primer lugar <span aria-hidden="true">→</span></a>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="ayuda-tabla" id="ayuda-tabla">Deslizá la tabla hacia los lados para ver todas las columnas.</p>
      <div className="tabla-contenedor" role="region" aria-labelledby="titulo-listado"
        aria-describedby="ayuda-tabla" tabIndex={0}>
        <table className="tabla">
          <caption className="solo-lectores">Puntos de infraestructura y su estado operativo</caption>
          <thead>
            <tr>
              <th scope="col">Lugar</th>
              <th scope="col">Tipo</th>
              <th scope="col">Datos técnicos</th>
              <th scope="col">Estado</th>
              <th scope="col">Ubicación</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {puntos.map((punto) => (
              <tr key={punto.id} className={punto.id === idEditando ? 'fila-editando' : ''}>
                <th scope="row">
                  <span className="nombre-lugar">{punto.nombre}</span>
                  {punto.id === idEditando && <span className="marca-edicion">En edición</span>}
                </th>
                <td><span className="tipo-lugar">{NOMBRES_TIPO[punto.tipo] ?? punto.tipo}</span></td>
                <td className="datos-tabla">{punto.datosTecnicos || 'Sin datos técnicos'}</td>
                <td>
                  <span className={punto.estadoOperativo ? 'estado estado-ok' : 'estado estado-falla'}>
                    <span className="estado-punto" aria-hidden="true" />
                    {punto.estadoOperativo ? 'Funciona' : 'Fuera de servicio'}
                  </span>
                </td>
                <td className="ubicacion-tabla">{describirUbicacion(punto.ubicacion)}</td>
                <td>
                  <div className="acciones">
                    <button type="button" className="boton boton-tabla" onClick={() => onEditar(punto)}
                      aria-label={`Editar ${punto.nombre}`}>
                      <Icono nombre="editar" />Editar
                    </button>
                    <button type="button" className="boton boton-tabla boton-borrar" onClick={() => onEliminar(punto)}
                      aria-label={`Borrar ${punto.nombre}`}>
                      <Icono nombre="borrar" />Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TablaPuntos