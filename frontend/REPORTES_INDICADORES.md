# Reportes e indicadores: recorrido del frontend

Implementación del 6 de noviembre de 2026 (Sprint 4, ítem 14 del Product Backlog, RF10).
Consume el backend ya integrado en `develop` (`ReporteController.java`). No modifica código Java.

## Dónde está y quién la ve

**Más → Reportes**, solo para el encargado del corralón (`puedeVerReportes` en `utils/permisos.js`).
El backend valida lo mismo y responde 403 para cualquier otro rol.

## Qué muestra

1. **Qué período mirar**: Hoy, Esta semana, Este mes, Este año u Otras fechas (desde/hasta).
   Con un período rápido se manda solo `atajo` y el backend calcula las fechas con su reloj.
   Al pasar a "Otras fechas" se completan con el rango que se estaba viendo, para no mostrar un error antes de tiempo.
   "Agrupar la evolución" elige `granularidad` (día, semana o mes); se sugiere una según el período.
2. **Totales**: órdenes creadas, resueltas (con su %), las que siguen abiertas y el % del plan de
   mantenimiento cumplido a tiempo (`porcentajeCumplimiento` del backend).
3. **Evolución**: barras agrupadas de creadas y cerradas por período, en un solo eje. Al pasar el mouse
   aparece el detalle; "Ver los datos en una tabla" tiene los mismos números para teclado y lector de pantalla.
4. **Por estado, por tipo de trabajo y por cuadrilla**: rankings de barras horizontales (lista HTML: cantidad
   y % siempre escritos). Los estados llevan el color que informa el backend.
5. **Mantenimiento programado**: cuántas órdenes del plan terminaron a tiempo, adelantadas, demoradas,
   pendientes o canceladas, y el desvío promedio en días.
6. **Descargas CSV**: "Trabajos finalizados" (`/reportes/ots-resueltas/csv`) y "Desvíos del plan"
   (`/reportes/desvios/csv`) para el mismo período. Se piden con el token (un enlace común no lo manda)
   y se guardan con el nombre que propone el backend.

Estados: cargando, error con "Volver a cargar", período sin datos y fechas inválidas (desde > hasta).

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/api/reportes.js` | `obtenerTablero`, `descargarOrdenesResueltas`, `descargarDesvios` |
| `src/api/cliente.js` | Nuevo `pedirArchivo` (descargas con sesión) y `nombreDeArchivo` (Content-Disposition) |
| `src/utils/reportes.js` | Lógica pura: parámetros, validación, etiquetas de períodos, barras y eje |
| `src/pages/PaginaReportes.jsx` | La pantalla |
| `src/components/SelectorPeriodo.jsx` | Período y agrupación |
| `src/components/GraficoEvolucion.jsx` | Gráfico de evolución + tabla de datos |
| `src/components/BarrasHorizontales.jsx` | Rankings |
| `src/estilos-reportes.css` | Estilos de la pantalla |
| `tests/reportes.test.js` | 16 pruebas (API, período, textos y cálculos) |

Sin dependencias nuevas: el gráfico es HTML y CSS. Colores de las series: cian y naranja de marca,
validados para daltonismo (ΔE 18,5 protanopia) y con contraste ≥ 3:1 sobre blanco.

## Validación realizada

- `npm test` (272 pruebas), `npm run lint` y `npm run build` sin errores.
- Prueba en navegador contra un backend simulado en localhost (en la compu no había PostGIS ni Docker):
  período, "Otras fechas", agrupación, globo del gráfico, descarga de CSV, a 1366 px y 390 px de ancho sin
  desborde horizontal.

## Pendiente

- Verificar con el backend real y datos reales (formatos de período `YYYY-MM-DD`, `YYYY-"W"IW`, `YYYY-MM`).
- El atajo `AÑO` lleva Ñ: viaja codificado (`A%C3%91O`); confirmar que Spring lo convierte bien en el servidor desplegado.
