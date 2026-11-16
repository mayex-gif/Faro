import Icono from './Icono'
import { ACCIONES, FILTROS_VACIOS, TIPOS_REGISTRO_CONOCIDOS, rangoValido } from '../utils/auditoria'

// Filtros de la pantalla Auditoría. A diferencia de Infraestructura y Órdenes (que filtran al instante una
// lista ya descargada), acá cada búsqueda es un pedido nuevo al backend (la lista está paginada): por eso
// hay un botón "Buscar" en lugar de filtrar en cada tecleo.
function FiltrosAuditoria({ filtros, onCambiar, onBuscar, onLimpiar, buscando }) {
  const valido = rangoValido(filtros)

  function cambiar(campo, valor) {
    onCambiar({ ...filtros, [campo]: valor })
  }

  function enviar(evento) {
    evento.preventDefault()
    if (valido) onBuscar()
  }

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS)

  return (
    <section className="bloque-filtros" aria-label="Buscar y filtrar la auditoría">
      <form className="filtros filtros-auditoria" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="filtro-auditoria-accion">Acción</label>
          <select id="filtro-auditoria-accion" value={filtros.accion} onChange={(e) => cambiar('accion', e.target.value)}>
            <option value="">Todas</option>
            {ACCIONES.map((accion) => <option key={accion.valor} value={accion.valor}>{accion.etiqueta}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-auditoria-tipo">Tipo de registro</label>
          <input id="filtro-auditoria-tipo" list="tipos-registro-conocidos" value={filtros.tipoRegistro}
            placeholder="Elegí de la lista o escribí uno" onChange={(e) => cambiar('tipoRegistro', e.target.value)} />
          <datalist id="tipos-registro-conocidos">
            {TIPOS_REGISTRO_CONOCIDOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}
          </datalist>
        </div>
        <div className="campo">
          <label htmlFor="filtro-auditoria-id">ID del registro</label>
          <input id="filtro-auditoria-id" value={filtros.registroId} placeholder="Ej.: 12"
            onChange={(e) => cambiar('registroId', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="filtro-auditoria-actor">Actor</label>
          <input id="filtro-auditoria-actor" value={filtros.actor} placeholder="Email de quien hizo el cambio"
            onChange={(e) => cambiar('actor', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="filtro-auditoria-desde">Desde</label>
          <input id="filtro-auditoria-desde" type="date" value={filtros.desde} max={filtros.hasta || undefined}
            onChange={(e) => cambiar('desde', e.target.value)} aria-invalid={valido ? undefined : true} />
        </div>
        <div className="campo">
          <label htmlFor="filtro-auditoria-hasta">Hasta</label>
          <input id="filtro-auditoria-hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined}
            onChange={(e) => cambiar('hasta', e.target.value)} aria-invalid={valido ? undefined : true} />
        </div>
        <div className="campo campo-ancho botones-filtro-auditoria">
          <button type="submit" className="boton boton-primario" disabled={!valido || buscando}>
            <Icono nombre="buscar" />{buscando ? 'Buscando…' : 'Buscar'}
          </button>
          {hayFiltros && (
            <button type="button" className="boton boton-secundario" onClick={() => { onCambiar(FILTROS_VACIOS); onLimpiar() }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </form>
      {!valido && <p className="mensaje mensaje-error" role="alert">La fecha "Desde" tiene que ser anterior o igual a "Hasta".</p>}
    </section>
  )
}

export default FiltrosAuditoria
