import { createContext, useContext } from 'react'

export const ContextoSesion = createContext(null)

export function useSesion() {
  // Le pasamos ContextoSesion, que es el que creamos arriba
  const contexto = useContext(ContextoSesion) 
  
  // Si es null (porque faltó envolver algún componente en el Provider), 
  // devuelve un objeto básico para evitar el "Uncaught TypeError"
  if (!contexto) return { usuario: null } 
  
  return contexto
}