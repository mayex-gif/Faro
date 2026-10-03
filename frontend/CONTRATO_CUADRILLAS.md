# Contrato provisorio: cuadrillas y asignación de OT

Tarea: **4. Asignación de OT a cuadrillas** (Sprint 1, RF04).

El frontend ya implementa la pantalla "Asignación a cuadrillas" (`src/pages/PaginaAsignacion.jsx`),
pero el backend todavía no tiene cuadrillas. Este documento describe lo que la pantalla espera.
Si el backend necesita otra forma, se ajusta `src/api/cuadrillas.js` y los componentes que lo usan.

## Qué es una cuadrilla

Un conjunto de trabajadores que resuelve las tareas que se le asignan. Se la describe con:

| Campo | Tipo | Significado |
|---|---|---|
| `id` | número | Identificador |
| `nombre` | texto | Ej: "Cuadrilla Verde" |
| `integrantes` | número (opcional) | Cantidad de trabajadores; si falta, se muestra "—" |
| `tiposTrabajo` | lista de `TipoTrabajo` | Tareas que realiza: `PODA`, `CORTE_DE_PASTO`, etc. (los mismos valores del enum del backend) |
| `disponible` | booleano | `true` si no está haciendo ningún trabajo en este momento |

## Endpoints

### `GET /api/cuadrillas`
Devuelve la lista de cuadrillas. No se usa paginación.

### `PATCH /api/ordenes-trabajo/{id}/cuadrilla`
Cuerpo: `{ "cuadrillaId": 3 }`

Asigna la OT a la cuadrilla **y la pasa al estado siguiente del flujo** (por ejemplo, de Pendiente a En curso).
El backend decide a qué estado pasa según los estados configurados; el frontend no escribe nombres de estado.
Responde la OT actualizada: el `OrdenTrabajoDTO` actual más dos campos nuevos,
`cuadrillaId` y `cuadrillaNombre` (`null` mientras no tenga cuadrilla).

Errores, con el formato habitual `{ estado, mensaje, errores }` (el `mensaje` se muestra tal cual al usuario):

| Código | Cuándo |
|---|---|
| 404 | La OT o la cuadrilla no existen |
| 409 | La OT ya no está pendiente, la cuadrilla está ocupada o no realiza ese tipo de trabajo |

## Cómo usa esto la pantalla

- **Pendientes:** las OT cuyo estado tiene `inicial: true` en `GET /api/estados-orden`.
- **Qué se ofrece en cada fila:** solo las cuadrillas cuyo `tiposTrabajo` incluye el tipo de la OT.
  Las ocupadas aparecen deshabilitadas.
- **Después de asignar:** la OT se reemplaza por la respuesta del `PATCH` (sale de la lista de pendientes)
  y se vuelve a pedir `GET /api/cuadrillas` para actualizar la disponibilidad, también si hubo error.
- El backend debe repetir las validaciones: la pantalla ayuda, pero no es la única barrera.

## Decisiones abiertas para el backend

- ¿Cuándo vuelve `disponible` a `true`? Se propone: al pasar la OT a un estado de cierre (Finalizada o Cancelada).
- ¿Una cuadrilla puede tener más de una OT a la vez? La pantalla asume que no (ocupada = no se le asigna más).
- ¿Se necesita desasignar o reasignar? No está en el alcance de esta pantalla.
- Mientras el endpoint no exista, la pantalla muestra "No pudimos cargar las cuadrillas" con el botón "Volver a cargar".
