// Los degradés que usa el dibujo del poste (utils/poste.js): metal del poste, carcasa de la lámpara,
// luz encendida y cono de luz. Se ponen UNA sola vez en la página y todos los postes los usan por su id.
// Es un SVG de tamaño cero: no se ve ni lo leen los lectores de pantalla.
function DefinicionesPoste() {
  return (
    <svg className="definiciones-poste" width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="faro-poste-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#55626A" />
          <stop offset="0.45" stopColor="#E6ECEF" />
          <stop offset="1" stopColor="#3F4B52" />
        </linearGradient>
        <linearGradient id="faro-poste-carcasa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7C8A92" />
          <stop offset="1" stopColor="#2C363C" />
        </linearGradient>
        <radialGradient id="faro-poste-luz" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FFFBE3" />
          <stop offset="1" stopColor="#FFC21F" />
        </radialGradient>
        <linearGradient id="faro-poste-cono" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD66E" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD66E" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default DefinicionesPoste
