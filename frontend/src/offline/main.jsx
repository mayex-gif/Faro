import { createRoot } from 'react-dom/client'
import ConsultaLocal from './ConsultaLocal.jsx'
import { registrarAplicacion } from './registrar.js'
import '../index.css'
import '../App.css'
import '../estilos-navegacion.css'
import '../estilos-mis-tareas.css'
import './estilos-local.css'

createRoot(document.getElementById('root')).render(<ConsultaLocal />)
registrarAplicacion()
