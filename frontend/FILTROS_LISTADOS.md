# Filtros de lugares y órdenes de trabajo

Tarea: [5. Listado y Filtros Básicos de OT y Lugares](https://trello.com/c/4lwWELiC).

## Base e integración

La rama `feature/filtros-ordenes-trabajo` nace de `develop` actualizado y utiliza
el módulo de OT de Santino del [PR #13](https://github.com/mayex-gif/Faro/pull/13),
todavía pendiente de aprobación al iniciar este trabajo.
Aprobar e integrar primero ese PR; luego revisar los cambios propios de filtros hacia
`develop`. No integrar el módulo de OT dos veces ni atribuirlo a esta tarea.

## Qué agrega el frontend

- OT: búsqueda por descripción, nombre del lugar o número; ignora mayúsculas y tildes.
- Prioridad, tipo, origen y lugar, combinados entre sí y con la búsqueda.
- Fecha de creación desde/hasta, inclusive, con uno o ambos límites.
- Aviso claro cuando el rango está invertido.
- Contador de resultados, limpieza y mensaje de ausencia de coincidencias.
- Filtros de lugares con etiquetas visibles y la misma presentación adaptable.

Los componentes muestran los controles; `utils/filtrosOrdenes.js` calcula el listado.
El formulario, los endpoints del backend, los datos y el orden original se conservan.
No se agregan librerías. El cliente usa /api mediante el proxy existente de Vite y la configuración importa process desde Node para pasar ESLint.

## Límites de la tarjeta

Se mantiene la decisión del PR #7 de filtrar la lista descargada en el navegador.
Los endpoints de búsqueda y paginación del checklist **siguen pendientes del backend**.
Si aumenta el volumen de registros, el equipo deberá implementar filtrado y paginación
en el servidor; el contador actual corresponde a la lista completa descargada.

El estado de las OT **depende de la tarjeta 3 (motor de flujo configurable)**.
El módulo de OT integrado desde el PR #13 aún no tiene ese campo. No inventar estados fijos ni marcar toda la tarjeta 5
como finalizada: presentar al Scrum Master el alcance de frontend disponible.

“Diseño de pantallas base en Figma” es otra actividad pendiente en Trello.
La guía y estas pantallas implementadas sirven como referencia, pero no sustituyen
un archivo de Figma.

## Cómo verificar

Con Docker Desktop encendido, desde la raíz del proyecto:

```powershell
docker compose up --build -d
```

Abrir http://localhost:5173 y entrar a Órdenes de trabajo.
Con órdenes ya registradas:
1. Combinar búsqueda, prioridad y lugar; comprobar el contador y las filas.
2. Usar la fecha de creación de una orden como ambos límites: debe aparecer.
3. Invertir las fechas: debe mostrarse la advertencia.
4. Buscar algo inexistente: debe ofrecer ver todas las órdenes.
5. Limpiar filtros y comprobar que se recupera el listado.
6. Editar una orden filtrada y cancelar: los criterios deben conservarse.
7. Revisar Infraestructura y repetir búsqueda/tipo/estado en celular.

Las pruebas usan datos ficticios en memoria y no escriben en la base:

```powershell
cd frontend
npm test
npm run build
```

Guía visual: [GUIA_ESTILOS.md](GUIA_ESTILOS.md).


## Validación realizada — 1/10/2026

- 15 pruebas de filtros aprobadas (`npm test`).
- Compilación de producción y ESLint general aprobados.
- Revisión en escritorio, tablet de 768 px y celulares de 390 y 320 px, sin desbordamiento de página.
- Combinación de criterios, búsqueda sin tildes, fechas inclusivas, rango invertido, limpieza y navegación por teclado.
- Edición y cancelación conservan los filtros; al guardar una nueva prioridad se recalcula el listado.
- Verificación funcional contra un backend real con una base temporal separada. Los contenedores y la base temporal se retiraron al terminar.

## Actualización de integración — 2/10/2026

- Integrados los últimos cambios de develop, incluidos JaCoCo y los tests de controladores.
- Se conserva la interfaz de filtros y la guía de estilos, sin cambios funcionales nuevos.
- Verificación después de la integración: 15 pruebas de frontend, ESLint y compilación de producción aprobados.
- El resultado de SonarCloud y de las pruebas del backend se verifica en los controles del PR #14.
