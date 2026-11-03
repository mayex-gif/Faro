# Mantenimiento periódico: recorrido del frontend

Implementación del 2 de noviembre de 2026, sobre `feature/frontend-mantenimiento-auditoria`, para integrar en `develop` mediante PR.
Completa el recorrido propuesto en `pendiente_FRONTEND_MOTOR_MANTENIMIENTO.md` a partir del frontend recibido en el ZIP del equipo. No modifica el backend.

## Crear una programación

1. Entrar como encargado del corralón a **Trabajos**.
2. Completar descripción, tipo de trabajo, lugar y prioridad.
3. Activar **Sí, programar este trabajo** y completar nombre, frecuencia, intervalo y fechas. Para frecuencia semanal se elige día de la semana; para mensual, día del mes.
4. Elegir **Guardar programación**. El origen se muestra como Plan de mantenimiento y la cuadrilla queda sin preasignar.

También se llega desde **Mantenimiento periódico → Programar desde Trabajos**. El alta está disponible solo para el encargado, conforme al permiso del backend.

El formulario valida fechas y datos antes del envío, no permite iniciar una programación nueva en el pasado y muestra una primera fecha prevista. Si el mes tiene menos días que el elegido, se usa el último día de ese mes. El servidor confirma la próxima ejecución al guardar.

## Qué crea realmente el backend

`POST /api/mantenimiento-reglas` guarda **solo la regla**. Aunque la guía inicial mencionaba una primera OT inmediata, el servicio actual no la crea al guardar: la generación corresponde al proceso programado del backend (por defecto, diariamente a las 06:00).

Por eso el formulario realiza un único POST de regla: no registra además una OT común ni llama automáticamente a `/{id}/ejecutar`. Esta última acción genera la próxima OT inmediatamente, incluso si su fecha es futura, y queda como acción explícita de administración.

Cada OT generada tiene su propio estado e historial, origen `PLAN_MANTENIMIENTO`, `reglaMantenimientoId` y `fechaPlanificada`. En el listado de Trabajos se distingue con la etiqueta **Periódica** y la fecha prevista. Editar una OT modifica esa instancia; la frecuencia se administra en Mantenimiento periódico.

## Administrar y trabajar sin conexión

Mantenimiento periódico conserva listado, búsqueda, filtros, edición, pausa/reactivación, generación manual, borrado permitido por el backend y consulta de desvíos. El formulario de edición aparece únicamente al elegir una regla existente.

Las programaciones requieren conexión y no entran en la cola offline de las OT. La creación de una OT común mantiene su envío idempotente y su cola sin conexión.

El POST de reglas todavía no tiene identificador idempotente. El formulario bloquea envíos simultáneos y, si falla la red o se pierde la confirmación del servidor, impide reenviar desde ese formulario y ofrece revisar Mantenimiento antes de volver a crearla. El equipo de backend puede incorporar idempotencia a este endpoint en una tarea separada.

## Validación realizada

- 255 pruebas de frontend aprobadas, incluidas siete nuevas sobre conversión del formulario, fechas, recurrencia y ausencia de reintentos automáticos en el cliente de reglas.
- `npm run lint`, `npm run build` y `git diff --check` sin errores.
- Prueba en navegador: entrada desde Mantenimiento, campos condicionales, validación semanal, alternancia con OT común, alta de una regla futura, confirmación de primera fecha, edición y pausa. Se retiró la regla temporal sin generar OT; permaneció la OT que ya existía.
- Revisión de los campos nuevos a 390 px de ancho, sin desborde horizontal de la página.

## Integración de Auditoría y pendientes del equipo

Se integró también el frontend de Auditoría recibido en el ZIP: cliente de API, filtros, listado paginado y detalle de valores anteriores/nuevos. Está disponible para el encargado desde **Más → Auditoría**. Se ajustó Buscar/Limpiar para que repetir los mismos filtros dispare otra consulta, sin quedar cargando indefinidamente.

**Backend:** corregir el HTTP 500 de `GET /api/auditoria?page=0&size=20`, que informa `function lower(bytea) does not exist`. Ese error es independiente del formulario de mantenimiento; esta entrega no modifica código Java ni consultas a la base.

**Frontend + backend:** una vez corregida esa consulta, verificar con registros reales el listado, los filtros, la paginación y el detalle antes/después. La interfaz está integrada, pero Auditoría todavía no se declara validada de punta a punta.

**Equipo:** acordar si se necesita una primera OT inmediata al crear una programación. El comportamiento implementado respeta el servicio actual. También queda para backend agregar idempotencia al POST de reglas si se desea permitir reintentos seguros.

**Revisión:** probar el recorrido de mantenimiento y revisar la PR hacia `develop`. El avance se publica para aprobación; no implica aprobación ni cierre automático de tarjetas en Trello.
