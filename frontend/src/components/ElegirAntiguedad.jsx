import { datosDeAntiguedad } from '../utils/luminarias'

// La pregunta "¿Es nueva o vieja?" de los formularios de luminarias (agregar desde el mapa y Más → Luminarias).
// Dos opciones grandes (fáciles de tocar en el celular). Al agregar no viene ninguna elegida a propósito:
// así nadie la carga mal por apuro. Las reglas están en utils/luminarias.js (faltaAntiguedad, antiguedadParaGuardar).
// Props:
// - id: prefijo único para los id de la pantalla
// - valor: true (Nueva), false (Vieja) o null (todavía no se eligió / "Sin marcar")
// - onCambiar(nueva): se eligió una opción
// - error: texto del error (ej. "Elegí si la luminaria es nueva o vieja.")
// - obligatorio: muestra el asterisco (al agregar). No se usa "required" del navegador: el aviso lo da el formulario
//   en castellano (el del navegador sale en el idioma del navegador y tapa el nuestro).
// - ayuda: texto debajo de la pregunta (opcional)
function ElegirAntiguedad({ id, valor, onCambiar, error = '', obligatorio = true, ayuda = '' }) {
  const descripcion = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <fieldset className="elegir-antiguedad" aria-describedby={descripcion}>
      <legend>¿Es nueva o vieja? {obligatorio && <span aria-hidden="true">*</span>}</legend>
      <div className="opciones-antiguedad">
        {['nueva', 'vieja'].map((clave) => {
          const datos = datosDeAntiguedad(clave)
          const marcada = valor === (clave === 'nueva')
          return (
            <label key={clave} className={marcada ? 'opcion-antiguedad opcion-antiguedad-marcada' : 'opcion-antiguedad'}>
              <input type="radio" id={`${id}-${clave}`} name={`${id}-antiguedad`} value={clave} checked={marcada}
                aria-invalid={Boolean(error)} onChange={() => onCambiar(clave === 'nueva')} />
              <span className={`muestra-cabezal muestra-cabezal-${clave}`} aria-hidden="true" />
              <span><strong>{datos.nombre}</strong><span>{datos.descripcion}</span></span>
            </label>
          )
        })}
      </div>
      {ayuda && <p className="ayuda-campo" id={`${id}-ayuda`}>{ayuda}</p>}
      {error && <p className="error-campo" id={`${id}-error`} role="alert">{error}</p>}
    </fieldset>
  )
}

export default ElegirAntiguedad
