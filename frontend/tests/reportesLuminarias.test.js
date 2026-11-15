import test from 'node:test'
import assert from 'node:assert/strict'
import { COLORES_LUMINARIAS, otsPorLuminaria, resumenLuminarias, textoCantidadesLuminarias } from '../src/utils/reportes.js'

// Sección "Luminarias: nuevas y viejas" de Reportes. Solo datos en memoria.
function tablero(luminarias) {
  return { totalOts: 0, luminarias }
}
const grupo = (clave, datos = {}) => ({
  clave, cantidad: 0, funcionan: 0, apagadas: 0, enArreglo: 0, otsDelPeriodo: 0, gastoDelPeriodo: 0, ...datos,
})
const pueblo = tablero({
  total: 125,
  aFuturo: 10,
  grupos: [
    grupo('nueva', { cantidad: 40, funcionan: 38, apagadas: 1, enArreglo: 1, otsDelPeriodo: 2, gastoDelPeriodo: 15000 }),
    grupo('vieja', { cantidad: 75, funcionan: 60, apagadas: 10, enArreglo: 5, otsDelPeriodo: 18, gastoDelPeriodo: 240000.5 }),
    grupo('sinMarcar'),
  ],
})

test('sin luminarias cargadas (o un backend viejo sin la sección) no hay nada para mostrar', () => {
  assert.equal(resumenLuminarias(tablero({ total: 0, aFuturo: 0, grupos: [] })), null)
  assert.equal(resumenLuminarias({ totalOts: 3 }), null)
  assert.equal(resumenLuminarias(null), null)
})

test('los números de arriba: nuevas, viejas y a futuro con su parte del total; "Sin marcar" solo si hay', () => {
  const resumen = resumenLuminarias(pueblo)
  assert.deepEqual(resumen.tarjetas.map((t) => [t.nombre, t.cantidad, t.porcentaje]),
    [['Nuevas', 40, 32], ['Viejas', 75, 60], ['A futuro', 10, 8]])
  assert.equal(textoCantidadesLuminarias(resumen), '40 nuevas · 75 viejas · 10 a futuro')
})

test('si hay sin marcar, aparecen en los números y en las tablas', () => {
  const conSinMarcar = tablero({ ...pueblo.luminarias, total: 128,
    grupos: [...pueblo.luminarias.grupos.slice(0, 2), grupo('sinMarcar', { cantidad: 3, funcionan: 3 })] })
  const resumen = resumenLuminarias(conSinMarcar)
  assert.deepEqual(resumen.grupos.map((g) => g.nombre), ['Nuevas', 'Viejas', 'Sin marcar'])
  assert.deepEqual(resumen.tarjetas.map((t) => t.clave), ['nueva', 'vieja', 'sinMarcar', 'aFuturo'])
})

test('"Cómo están hoy": una fila por estado con nuevas y viejas', () => {
  assert.deepEqual(resumenLuminarias(pueblo).estados.map((e) => [e.nombre, e.nueva, e.vieja]),
    [['Funcionan', 38, 60], ['Apagadas', 1, 10], ['En arreglo', 1, 5]])
})

test('si falta un grupo en la respuesta, va en cero', () => {
  const resumen = resumenLuminarias(tablero({ total: 4, aFuturo: 0, grupos: [grupo('vieja', { cantidad: 4, funcionan: 4 })] }))
  assert.equal(resumen.grupos[0].cantidad, 0)
  assert.equal(resumen.grupos[1].cantidad, 4)
})

test('órdenes por luminaria, para comparar grupos de distinto tamaño', () => {
  const [nuevas, viejas] = resumenLuminarias(pueblo).grupos
  assert.equal(otsPorLuminaria(nuevas), '0,1') // 2 en 40
  assert.equal(otsPorLuminaria(viejas), '0,2') // 18 en 75
  assert.equal(otsPorLuminaria(grupo('sinMarcar')), '—')
})

test('azul para las nuevas y naranja para las viejas (validados con dataviz)', () => {
  assert.deepEqual(COLORES_LUMINARIAS, { nueva: '#2A78D6', vieja: '#EB6834' })
})
