// Funciones para consultar los estados de las Órdenes de Trabajo.
import { pedir } from './cliente'

// GET: todos los estados, en orden. Cada uno trae "siguientes": a qué estados se puede pasar.
// Ej: [{ id: 1, nombre: 'Pendiente', color: '#566A73', inicial: true, cierre: false, siguientes: [2, 3, 5] }, ...]
export function listarEstados() {
  return pedir('/estados-orden')
}
