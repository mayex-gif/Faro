# PWA — consulta local de tareas (Sprint 3)

Primera parte de la [tarjeta PWA: Sincronización Offline](https://trello.com/c/2RRyfzp1): **Service Worker e IndexedDB para consulta local**. La segunda parte (cambios sin señal, envío automático y conflictos en el backend) está en [PWA_SINCRONIZACION.md](./PWA_SINCRONIZACION.md).

La rama `feature/pwa-consulta-local` depende del Login del [PR #40](https://github.com/mayex-gif/Faro/pull/40), que todavía espera aceptación. El PR de PWA se presenta hacia `develop`, según la guía del equipo. **Integrar primero el #40** y después actualizar esta rama desde `develop` antes de aceptar la PWA. Mientras tanto, la comparación general también incluye el commit de Login; el commit posterior «Agrega consulta local de tareas y base PWA» contiene únicamente esta entrega. No fusionar el PR de PWA antes del Login.

## Qué permite

- El capataz, con sesión verificada por el servidor, abre Mis tareas y elige **Guardar copia local**. Se guardan únicamente los trabajos abiertos de su cuadrilla, sin credenciales ni el listado del resto del municipio. También puede actualizar o eliminar esa copia.
- **Ver copia local** abre una pantalla con la cuadrilla, la fecha de guardado y las tareas. Si no tenía tareas al guardar, se informa expresamente. Desde la sincronización (26/10/2026) también se puede **iniciar y finalizar**: va al cuaderno del celular y se envía solo (ver [PWA_SINCRONIZACION.md](./PWA_SINCRONIZACION.md)). La copia guarda además los estados y sus caminos (versión 2).
- Con la versión compilada preparada en ese navegador, la pantalla y los archivos necesarios se abren aunque no haya conexión al servidor. El Service Worker no guarda respuestas de la API, contraseñas ni mapas de terceros.
- Si la aplicación no consigue verificar el perfil, ofrece **Consultar copia local**. No abre la navegación completa; lo que se cambia desde la copia el servidor lo valida al recibirlo (permisos, cuadrilla, conflictos).
- La copia está vinculada al usuario y a su cuadrilla. Su lectura requiere que la sesión guardada siga vigente. Al cerrar o cambiar de sesión se intenta eliminar la copia; si el navegador falla, el control de usuario/cuadrilla evita presentarla a otra cuenta.

**Los datos pueden estar desactualizados.** La consulta local no comprueba si la cuenta fue desactivada o si la OT se reasignó mientras el dispositivo estaba sin red. No otorga permisos para operar: el acceso normal vuelve a consultar el perfil al servidor. No sustituye las autorizaciones que todavía faltan en las API de negocio.

## Qué queda pendiente

- ~~Cambiar estados sin señal, encolar operaciones y reenviarlas al reconectar.~~ Hecho: ver [PWA_SINCRONIZACION.md](./PWA_SINCRONIZACION.md).
- ~~Resolver conflictos cuando una OT cambió de estado o de cuadrilla en otro dispositivo.~~ Hecho en el backend (`/api/sincronizacion`).
- Instalar/verificar en teléfonos físicos. El manifiesto y el icono son la base; no se afirma compatibilidad verificada con todos los navegadores.
- Guardar cartografía o consultar toda la ficha histórica sin red. Solo se conserva el resumen de las tareas.

Lo que había que acordar con backend quedó resuelto así: el estado en que se vio la OT (`estadoAnteriorId`), un número por operación para evitar duplicados (`operacionId`), la validación de usuario/cuadrilla al recibir y un 409 con el motivo ante un conflicto. Una operación rechazada queda visible para revisión y nunca sobrescribe el trabajo de otro compañero.

## Cómo está organizado

- `src/offline/datosLocal.js`: construye y valida una copia mínima de la cuadrilla.
- `src/offline/almacen.js`: lectura, escritura y eliminación en IndexedDB. No guarda una respuesta tardía si cambió la sesión.
- `src/offline/ConsultaLocal.jsx`: vista de solo consulta, reutilizando `TarjetaTarea` sin botones de ejecución.
- `sin-conexion.html`: entrada de esa vista. No usa el contexto para abrir el resto de la aplicación sin verificar el perfil.
- `scripts/generar-sw.js` y `service-worker.js`: generan la versión de caché y la lista de recursos del build. Solo interceptan los archivos estáticos propios de FARO.
- `public/manifest.webmanifest` e `icono-app.svg`: nombre, colores y logo original del proyecto. El SVG contiene el logo existente dentro de un margen de seguridad.

Después de un deploy, las páginas se piden primero a la red (al abrir FARO se ve la versión nueva) y, con FARO abierto, aparece "Hay una versión nueva de FARO → Actualizar": la recarga la decide la persona, nunca se fuerza mientras alguien está trabajando. El navegador puede eliminar el almacenamiento: si no hay copia se pide volver a guardarla con conexión. No hay bibliotecas nuevas.

## Cómo revisar

1. En el entorno normal (`localhost:5173` con Vite), ingresar como capataz y revisar Guardar/Actualizar/Eliminar copia y Ver copia local. El modo de desarrollo no registra el Service Worker, para conservar la recarga de cambios.
2. Para verificar la apertura sin servidor, usar el **build** en un perfil de navegador de pruebas. El backend local admite por defecto el origen `http://localhost:5173`, por lo que la vista previa debe usar ese puerto:

   ```powershell
   docker compose exec -T frontend npm run build
   docker compose stop frontend
   docker compose run --rm --no-deps --service-ports frontend npm run preview -- --host 0.0.0.0 --port 5173
   ```

3. Con conexión, ingresar como capataz, guardar la copia y abrirla. Luego simular red desconectada desde las herramientas de desarrollo del navegador y recargar. Comprobar fecha, cuadrilla y ausencia de acciones de escritura.
4. Reconectar, cerrar sesión y volver a ingresar. La copia anterior ya no debe aparecer. Probar otra cuenta y otro capataz: no deben ver una copia ajena.
5. Al terminar la prueba del build, quitar su Service Worker desde **Application → Service Workers → Unregister** en el perfil de pruebas, cerrar esa vista previa y restaurar el entorno habitual con `docker compose up -d frontend`. La vista previa de Vite se usa para revisar el build, no como servidor de producción.

Pruebas de código desde `frontend`: `npm test`, `npm run lint` y `npm run build`. Incluyen separación por usuario/cuadrilla, exclusión de OT cerradas, errores de almacenamiento, cierre durante un guardado y límites del Service Worker.

### Revisión local — 20/10/2026

- 139 pruebas aprobadas (11 nuevas de copia local, IndexedDB y Service Worker), ESLint y build correctos.
- Guardado y recuperación reales en IndexedDB con la cuenta capataz de Cuadrilla Verde.
- La pantalla se recargó con el servidor de vista previa detenido y conservó cuadrilla, fecha y contenido guardado. Al abrir el inicio sin servidor, apareció la alternativa de consultar la copia, manteniendo bloqueada la aplicación sin verificar el perfil.
- Se comprobó el cierre de sesión y el nuevo ingreso sin recuperar la copia anterior.
- Revisada la consulta local en escritorio y con anchos de celular de 320 y 390 px, sin desborde horizontal.
- La base local no tenía OT asignadas a esa cuadrilla: el recorrido real mostró una copia vacía. Las pruebas con órdenes abiertas, cerradas y de otra cuadrilla usan datos en memoria; no se modificaron datos municipales para la demostración.
- El entorno se devuelve al servidor de desarrollo después de las comprobaciones. La rama se publica para revisión del equipo; la tarjeta completa de PWA continúa en desarrollo hasta completar y aceptar sus pendientes.

## Figma y coordinación

Conviene registrar en Sprint 3 **Actualizar prototipo Figma — Login, roles y consulta sin conexión**: incorporar Login, navegación actual «El mapa primero», Mis tareas del capataz y estados de copia disponible/no disponible/vencimiento, en escritorio y celular. Mantener la guía visual y diferenciar los diseños propuestos de las funciones implementadas. La entrega de Sprint 2 permanece como antecedente.

Referencias técnicas: [Service Workers, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [almacenamiento local e IndexedDB, MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Client-side_storage) y [vista previa del build, Vite](https://vite.dev/guide/static-deploy.html).
