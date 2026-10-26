# PWA — Sincronización sin señal (Sprint 3)

Segunda parte de la [tarjeta PWA: Sincronización Offline](https://trello.com/c/2RRyfzp1). La primera parte (#41, [PWA_CONSULTA_LOCAL.md](./PWA_CONSULTA_LOCAL.md)) permite **consultar** las tareas sin señal; esta permite **hacer cambios** sin señal, mandarlos solos cuando vuelve la red y resolver en el backend los conflictos con lo que otra persona cambió mientras tanto.

## 1. La idea en tres frases

- **El cuaderno:** lo que se hace sin señal se anota en el celular (IndexedDB) y la pantalla lo muestra como hecho, con la marca **"Sin enviar"**.
- **El número de comanda:** cada anotación lleva un número único (`operacionId`, un UUID que inventa el celular). Si el servidor la recibe dos veces (el celular no supo si llegó y la reintentó), la aplica **una sola vez**: nunca se duplica un cambio, un evento de la ficha ni una OT.
- **"Yo la vi en Planificada":** cada cambio de estado dice en qué estado estaba la OT cuando se tocó el botón. Si en el servidor ya está en otro, **no se pisa** el trabajo de otra persona: se avisa y decide la persona.

**Regla determinista: gana el primero que llega al servidor; un cambio hecho sobre un estado viejo no pisa lo que hizo otro.**

## 2. Decisiones del equipo (26/10/2026)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Qué se puede hacer sin señal? | El **capataz** inicia/finaliza sus tareas. **Encargado y mesa** crean OT nuevas (si FARO ya estaba abierto cuando se cortó la señal). Editar una OT o cambiarle el estado desde Trabajos sigue necesitando señal. |
| 2 | Si al volver la red el cambio ya no vale | Se avisa y **decide la persona solo si todavía se puede**: "Aplicar igual" o "Descartar". Si ya no se puede (OT cerrada, de otra cuadrilla, borrada, lugar borrado) → solo "Entendido". |
| 3 | ¿Y si la sesión venció o la cuenta fue dada de baja? | El cuaderno **espera a que vuelva a entrar la misma persona** (nunca se manda con otra cuenta). Si al entrar la cuenta figura desactivada, se ofrece descartar. |
| 4 | ¿Dónde se ve lo pendiente? | **Cartel** con el detalle (Mis tareas, Trabajos y la consulta local) **y contador** en la barra de arriba. |

## 3. Backend: la "ventanilla de comandas atrasadas"

Endpoints aparte de `/api/ordenes-trabajo` (que no cambia). Son **PUT** con el número de comanda en la dirección: PUT significa "dejá esto así", y repetirlo deja todo igual.

| Endpoint | Body | Quién |
|---|---|---|
| `PUT /api/sincronizacion/cambios-estado/{operacionId}` | `{ ordenId, estadoId, estadoAnteriorId, hechoEn }` | encargado y capataz |
| `PUT /api/sincronizacion/altas-orden/{operacionId}` | `{ orden: { descripcion, tipo, origen, prioridad, lugarId }, hechoEn }` | encargado y mesa |

- Responde **200** con la OT. Si la misma comanda vuelve a llegar, responde lo mismo que la primera vez (la OT como está ahora, o el mismo conflicto) **sin volver a aplicarla**. Un número usado por otra persona u otra OT → 409.
- **Conflicto → 409** con `errores.motivo`, `errores.sePuedeAplicar` (`"true"`/`"false"`) y, si corresponde, `errores.estadoActualId` y `errores.estadoActual`:

| Motivo | Cuándo | ¿Aplicar igual? |
|---|---|---|
| `ESTADO_CAMBIADO` | otra persona la movió antes | solo si existe el camino desde el estado actual |
| `ORDEN_CERRADA` | ya está Finalizada o Cancelada | no |
| `OTRA_CUADRILLA` | se reasignó y ya no es de la cuadrilla del capataz | no |
| `ORDEN_NO_EXISTE` / `DATO_NO_EXISTE` | se borró la OT, el estado o el lugar | no |
| `CAMINO_NO_PERMITIDO` / `SIN_PERMISO` | las reglas de siempre lo rechazan | no |

- Si alguien ya la había dejado como se quería ("ya estaba así"), responde 200 **sin** otro evento en la ficha.
- **Todo queda registrado** en la tabla `operaciones_sincronizadas` (número, tipo, quién, qué OT, estado pedido y visto, `hecho_en`, `recibida_en`, `APLICADA`/`CONFLICTO`, motivo).
- Dos cambios de la misma OT a la vez: `OrdenTrabajoRepository.buscarParaCambiar` "agarra" la OT (`SELECT … FOR UPDATE`) y el segundo espera al primero. Dos envíos de la misma comanda a la vez: el segundo choca con la clave y responde lo del primero.
- Código: `SincronizacionController`, `SincronizacionService` (usa `OrdenTrabajoService`: no repite reglas), `OperacionSincronizada`, `ConflictoSincronizacionException` (+ `ManejadorDeErrores`). Tests: `SincronizacionServiceTest` (25) y `SincronizacionControllerTest` (13).
- `hechoEn` (la hora real en el celular) se guarda en la tabla; la ficha histórica muestra la hora en que llegó.

## 4. Frontend

| Archivo | Qué hace |
|---|---|
| `src/offline/datosCola.js` | Reglas del cuaderno (funciones puras): armar un renglón, qué hacer si falla (`REINTENTAR` / `SESION` / `CONFLICTO`), orden de envío, "aplicar igual", cómo se ve la lista con lo no enviado. |
| `src/offline/cola.js` | El cuaderno en IndexedDB (`faro-cola-cambios`, **aparte** de la copia local: al cerrar sesión no se borra). Avisa los cambios (`faro:cola-cambio`) también a otras pestañas (BroadcastChannel). |
| `src/api/sincronizacion.js` | El PUT a la ventanilla. |
| `src/offline/sincronizar.js` | El **cartero**: manda de a uno y en orden, solo con la sesión de la misma persona, con un candado entre pestañas (Web Locks). |
| `src/hooks/useColaCambios.js` | El cuaderno al día para las pantallas; `useCuandoSeEnvian` para el aviso "Volvió la señal: se envió…". |
| `src/components/AvisoCambiosPendientes.jsx` | El cartel: "N cambios sin enviar" y "N para revisar" con sus botones. |
| `src/components/BarraUsuario.jsx` | El contador de arriba. |
| `src/pages/PaginaMisTareas.jsx` | El capataz inicia/finaliza sin señal; recuerda la lista si se corta la señal. |
| `src/components/FormularioOrden.jsx`, `src/pages/PaginaOrdenes.jsx`, `src/components/TablaOrdenes.jsx` | OT nuevas: **siempre** con número de comanda (también con señal), así un reintento nunca la duplica. Sin señal aparece "Nueva · Sin enviar". |
| `src/offline/ConsultaLocal.jsx`, `src/offline/datosLocal.js` | La consulta local (`sin-conexion.html`) también inicia y finaliza. La copia guarda los estados (versión 2) y se pone al día con cada respuesta. |
| `src/pages/PaginaLogin.jsx` | En el ingreso: "Hay N cambios guardados de Fulano"; si la cuenta está desactivada, "Descartar". |

**Cuándo manda el cartero:** al entrar, cuando vuelve la red (`online`), al volver a la pestaña, apenas se anota algo y, si falló, de nuevo a los 30 s, 1, 2, 4 y 5 min. Un 401 no toca nada: espera a que la persona vuelva a entrar.

**Envío con FARO cerrado (Background Sync, solo Chrome/Android):** sin señal se le pide al navegador que despierte al service worker cuando vuelva la red (`sync` con tag `faro-cola-cambios`). El worker (`scripts/envio-segundo-plano.js`) usa las mismas reglas: el build pega `datosCola.js` y `cola.js` dentro de `sw.js` (`scripts/armar-sw.js`). Para mandar necesita la cuenta y la dirección del backend, que se guardan en la tabla `sesion` del cuaderno y **se borran al cerrar sesión, al vencer la sesión o con un 401**. iPhone/Safari no tiene Background Sync: ahí manda la página (al abrir FARO, al volver la red o a la pestaña).

**Versión nueva después de un deploy:** el service worker pide primero a la red las páginas (`index.html`, `sin-conexion.html`; si no hay señal o tarda más de 4 s, usa la guardada). Con FARO abierto durante el deploy aparece **"Hay una versión nueva de FARO → Actualizar"** (`AvisoVersionNueva.jsx`, `src/offline/registrar.js`): la recarga la decide la persona. ⚠️ El **primer** deploy con este cambio todavía lo recibe el service worker viejo: esa vez hay que cerrar las pestañas de FARO.

## 5. Límites conocidos

- FARO no abre de cero sin señal (tiene que verificar la cuenta): sin señal se entra por **Consultar copia local** (solo capataz). El encargado y la mesa crean OT sin señal solo si FARO ya estaba abierto.
- Una copia local guardada antes del 26/10/2026 (versión 1) no se muestra: hay que tocar "Actualizar copia local" una vez con señal.
- Si se recibe un cambio por Background Sync, la copia local se pone al día recién la próxima vez que se guarde.

## 6. Cómo probar

**En la compu (Docker, modo desarrollo: sin service worker).** Hace falta el backend nuevo: `docker compose up --build` (en Swagger tiene que aparecer "Sincronización sin señal").

1. Entrar como capataz. Con las tareas ya cargadas: **F12 → Red (Network) → "Sin conexión" (Offline)**.
2. Tocar **Iniciar** o **Finalizar**: la tarjeta queda con "Sin enviar", aparece el cartel y el contador. Ir al Mapa y volver: la lista sigue.
3. Volver a **"Sin limitación"**: en unos segundos se envía y aparece "Volvió la señal: se envió 1 cambio…".
4. Conflicto: sin señal, Iniciar una tarea; desde otra ventana, como encargado, volverla a Pendiente; devolver la red → "1 cambio para revisar" con **Aplicar igual / Descartar**.
5. Como mesa de entradas, en Trabajos, registrar una OT sin señal → "Nueva · Sin enviar"; al volver la red se registra con su número.
6. Sin señal, cerrar sesión: el ingreso muestra los cambios guardados; al volver a entrar se envían.

**Con service worker** (abrir `sin-conexion.html` sin señal, versión nueva, Background Sync): con el build (`npm run build` + `npm run preview`, ver [PWA_CONSULTA_LOCAL.md](./PWA_CONSULTA_LOCAL.md#cómo-revisar)) o en Render.

**Pruebas de código:** backend `.\mvnw.cmd test` (299); frontend, desde `frontend`, `npm test` (226) y `npm run lint`. Además se probó todo con Playwright contra el backend real (red cortada de verdad, respuesta perdida, dos personas a la vez sobre la misma OT, cuenta dada de baja, deploy simulado y envío con FARO cerrado) a 390, 1280 y 1920 px.
