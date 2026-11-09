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
3. **Evolución**: gráfico de áreas (Recharts) con creadas y cerradas por período. Al pasar el mouse
   aparece el detalle; "Ver los datos en una tabla" tiene los mismos números para teclado y lector de pantalla.
4. **Por estado**: dona con el total en el centro y los colores que informa el backend; al lado, una leyenda
   (lista HTML) con cantidad y %.
5. **Por tipo de trabajo y por cuadrilla**: barras horizontales (Recharts) con cantidad y % al final de cada
   barra, y su tabla de datos.
6. **Mantenimiento programado**: dona con el % cumplido a tiempo en el centro y cuántas órdenes del plan
   terminaron a tiempo, adelantadas, demoradas, pendientes o canceladas; debajo, el desvío promedio en días.
7. **Descargas CSV**: "Trabajos finalizados" (`/reportes/ots-resueltas/csv`) y "Desvíos del plan"
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
| `src/components/GraficoEvolucion.jsx` | Evolución (áreas de Recharts) + tabla de datos |
| `src/components/GraficoBarras.jsx` | Rankings en barras horizontales (Recharts) + tabla de datos |
| `src/components/GraficoDona.jsx` | Dona (Recharts) con leyenda accesible y valor en el centro |
| `src/components/TablaDatosGrafico.jsx` | "Ver los datos en una tabla", compartida por los gráficos |
| `src/estilos-reportes.css` | Estilos de la pantalla |
| `tests/reportes.test.js` | 19 pruebas (API, período, textos y cálculos de los gráficos) |

Gráficos con **Recharts 3** (única dependencia nueva). `App.jsx` carga esta pantalla con `React.lazy`, así
Recharts (~120 KB gzip) viaja en un archivo aparte que solo baja quien abre Reportes; el service worker lo
guarda igual que el resto. Los colores están en `COLORES` de `utils/reportes.js` en hex (Recharts los escribe
como atributos SVG, donde `var(--x)` no funciona) y son los mismos tokens de marca: cian y naranja para las
series, verdes/naranja/rojo/grises para el plan.

## Validación realizada

- `npm test` (272 pruebas), `npm run lint` y `npm run build` sin errores.
- Prueba en navegador contra un backend simulado en localhost (en la compu no había PostGIS ni Docker):
  período, "Otras fechas", agrupación, globo del gráfico, descarga de CSV, a 1366 px y 390 px de ancho sin
  desborde horizontal.

## Pendiente

- Verificar con el backend real y datos reales (formatos de período `YYYY-MM-DD`, `YYYY-"W"IW`, `YYYY-MM`).
- El atajo `AÑO` lleva Ñ: viaja codificado (`A%C3%91O`); confirmar que Spring lo convierte bien en el servidor desplegado.

## Gráficos con Recharts (9 de noviembre de 2026)

Probado contra el backend real (PostGIS en Docker) con 70 órdenes de prueba de agosto a noviembre:
"Este mes" por día y "Este año" por mes, a 1366 px y 390 px sin desborde horizontal ni errores en la consola.
`npm test` (307 pruebas), `npm run lint` y `npm run build` sin errores.
