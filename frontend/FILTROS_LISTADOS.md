# Filtros de lugares y órdenes de trabajo

Tarea: [5. Listado y Filtros Básicos de OT y Lugares](https://trello.com/c/4lwWELiC).

## Base e integración

La rama `feature/filtros-ordenes-trabajo` nace de `develop` actualizado y utiliza
el módulo de OT de Santino del [PR #13](https://github.com/mayex-gif/Faro/pull/13),
que estaba pendiente de aprobación al iniciar este trabajo.
El PR #13 se integró en `develop` el 2/10/2026. Ese mismo día se actualizaron los
filtros con los cambios aprobados de `origin/develop`, sin conflictos.
La comparación del PR #14 ya muestra solamente filtros y documentación propios.
El módulo de OT corresponde al trabajo de Santino.

## Qué agrega el frontend

- OT: búsqueda por descripción, nombre del lugar o número; ignora mayúsculas y tildes.
- Prioridad, estado, tipo, origen y lugar, combinados entre sí y con la búsqueda.
- El selector de estado se arma con los estados que informa el backend (`GET /api/estados-orden`), en el orden del flujo. No hay nombres escritos en el código y, si los estados no cargan, el selector no se muestra.
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

El estado de las OT depende de la tarjeta 3 (motor de flujo configurable), que ya está integrada:
la lista de Órdenes incluye el filtro por estado, con los estados del backend. No inventar estados fijos.
Siguen pendientes los endpoints de búsqueda y paginación del servidor, por lo que no se debe marcar toda la tarjeta 5
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
