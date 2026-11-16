import { DIAS_SEMANA, FRECUENCIAS, esMensual, esSemanal } from '../utils/mantenimiento'

// Campos compartidos entre la programación desde Trabajos y la edición de una regla existente.
function CamposRecurrencia({ datos, errores, onCambiar, prefijo, fechaMinima }) {
  function atributos(campo) {
    return { id: `${prefijo}-${campo}`, name: campo, value: datos[campo], onChange: onCambiar,
      'aria-invalid': errores[campo] ? true : undefined,
      'aria-describedby': errores[campo] ? `error-${prefijo}-${campo}` : undefined }
  }
  function error(campo) {
    return errores[campo] ? <p className="error-campo" id={`error-${prefijo}-${campo}`}>{errores[campo]}</p> : null
  }
  return (
    <>
      <div className="campo">
        <label htmlFor={`${prefijo}-frecuencia`}>Frecuencia <span aria-hidden="true">*</span></label>
        <select {...atributos('frecuencia')} required>
          <option value="">Elegí la frecuencia</option>
          {FRECUENCIAS.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
        </select>
        {error('frecuencia')}
      </div>
      <div className="campo">
        <label htmlFor={`${prefijo}-intervalo`}>Intervalo <span aria-hidden="true">*</span></label>
        <input {...atributos('intervalo')} type="number" min={1} step={1} required />
        {error('intervalo')}
        <p className="ayuda-campo">Ej.: frecuencia semanal e intervalo 2 = cada dos semanas.</p>
      </div>
      {esSemanal(datos.frecuencia) && <div className="campo">
        <label htmlFor={`${prefijo}-diaSemana`}>Día de la semana <span aria-hidden="true">*</span></label>
        <select {...atributos('diaSemana')} required>
          <option value="">Elegí el día</option>
          {DIAS_SEMANA.map((d) => <option key={d.valor} value={d.valor}>{d.etiqueta}</option>)}
        </select>
        {error('diaSemana')}
      </div>}
      {esMensual(datos.frecuencia) && <div className="campo">
        <label htmlFor={`${prefijo}-diaMes`}>Día del mes <span aria-hidden="true">*</span></label>
        <input {...atributos('diaMes')} type="number" min={1} max={31} step={1} required />
        {error('diaMes')}
        <p className="ayuda-campo">Si el mes tiene menos días, se usa su último día.</p>
      </div>}
      <div className="campo">
        <label htmlFor={`${prefijo}-fechaInicio`}>Fecha de inicio <span aria-hidden="true">*</span></label>
        <input {...atributos('fechaInicio')} type="date" min={fechaMinima} required />
        {error('fechaInicio')}
      </div>
      <div className="campo">
        <label htmlFor={`${prefijo}-fechaFin`}>Fecha de fin <span className="opcional">(opcional)</span></label>
        <input {...atributos('fechaFin')} type="date" min={datos.fechaInicio || undefined} />
        {error('fechaFin')}
        <p className="ayuda-campo">Si no se completa, la programación sigue hasta que se pause.</p>
      </div>
    </>
  )
}

export default CamposRecurrencia
