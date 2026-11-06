import CamposRecurrencia from './CamposRecurrencia'
import { fechaProgramada, hoyArgentina, primeraFecha } from '../utils/recurrencia'

function SeccionRecurrencia({ datos, errores, onCambiar, conConexion }) {
  const primera = primeraFecha(datos)
  return (
    <section className="seccion-formulario seccion-recurrencia" aria-labelledby="titulo-recurrencia">
      <h3 id="titulo-recurrencia">¿Se repite periódicamente?</h3>
      <label className="campo-check">
        <input type="checkbox" name="habilitada" checked={datos.habilitada} onChange={onCambiar}
          aria-controls={datos.habilitada ? 'campos-recurrencia' : undefined} aria-expanded={datos.habilitada} />
        <span><strong>Sí, programar este trabajo</strong><span>Una OT nueva por cada fecha, con su propio estado e historial.</span></span>
      </label>
      {datos.habilitada && <div id="campos-recurrencia">
        <p className="ayuda-campo">Se guarda una programación usando el trabajo, lugar y prioridad de arriba. Cada OT tendrá origen “Plan de mantenimiento” y quedará pendiente de asignar cuadrilla.</p>
        {!conConexion && <p className="mensaje mensaje-informacion" role="status">Necesitás conexión para guardar una programación. Tus datos permanecen en el formulario.</p>}
        <div className="campos campos-regla">
          <div className="campo campo-ancho">
            <label htmlFor="recurrencia-titulo">Nombre de la programación <span aria-hidden="true">*</span></label>
            <input id="recurrencia-titulo" name="titulo" value={datos.titulo} onChange={onCambiar} required maxLength={150}
              placeholder="Ej.: Corte de pasto quincenal de la plaza"
              aria-invalid={errores.titulo ? true : undefined} aria-describedby={errores.titulo ? 'error-recurrencia-titulo' : undefined} />
            {errores.titulo && <p className="error-campo" id="error-recurrencia-titulo">{errores.titulo}</p>}
          </div>
          <CamposRecurrencia datos={datos} errores={errores} onCambiar={onCambiar} prefijo="recurrencia" fechaMinima={hoyArgentina()} />
        </div>
        <p className="mensaje mensaje-informacion" role="status">
          {primera && <>Primera fecha prevista: <strong>{fechaProgramada(primera)}</strong>. </>}
          Las OT se generan automáticamente según las fechas de la programación. Guardar aquí no crea una OT inmediata.
        </p>
      </div>}
    </section>
  )
}

export default SeccionRecurrencia
