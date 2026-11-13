# Comentarios y fotos en las órdenes de trabajo (Sprint 4 · tarjetas 16 y 21)

Cada OT tiene un **muro "Comentarios y fotos"**: cada mensaje lleva texto, fotos o las dos cosas. Sirve para contar cómo va
un trabajo y para dejar **evidencia** (fotos del antes y del después). Funciona también **sin señal**.

## 1. Quién puede qué

| Acción | Encargado | Mesa de entradas | Capataz |
|---|:-:|:-:|:-:|
| Ver el muro y las fotos de una OT | ✓ (todas) | ✓ (todas) | solo OT de su cuadrilla |
| Escribir (con o sin fotos) | ✓ (todas) | ✓ (todas) | solo OT de su cuadrilla |
| Borrar un comentario (con sus fotos) | ✓ (cualquiera) | solo los suyos | solo los suyos |
| Editar | ✗ (nadie: los comentarios no se editan) | ✗ | ✗ |

La auditoría (Más → Auditoría) anota quién escribió y quién borró (`ComentarioOrden` y `FotoComentario`).

## 2. Dónde está en la pantalla

- **Mis tareas** (celular): en cada tarea, el desplegable **"Comentarios y fotos"**. Al **Finalizar** una tarea, el pop-up de
  cierre permite sumar un comentario y fotos de evidencia; al **Cancelar**, el motivo queda como comentario (ver [CIERRE_DE_OT.md](./CIERRE_DE_OT.md)).
- **Trabajos** (Órdenes de trabajo): botón **"Comentarios"** en cada fila → se abre una hoja al costado.
- **Sacar foto** abre la cámara del celular; **Elegir fotos**, la galería (en la compu, el explorador de archivos).
- Tocando una miniatura se abre el **visor** (flechas para pasar, Escape o "Cerrar" para salir).

## 3. Límites

- Hasta **5 fotos** por comentario y **1000 caracteres** de texto. Hace falta texto **o** al menos una foto.
- El celular **achica cada foto** antes de mandarla: lado mayor de 1600 px, JPEG (una foto de 6 MB queda en ~300–400 KB).
  Al volver a dibujarla se pierden los datos ocultos de la foto (ubicación GPS, modelo del celular).
- El backend acepta solo **JPG, PNG o WEBP de hasta 3 MB** y revisa los primeros bytes del archivo (no le cree al nombre).
  Si se pasa: **413**; si no es una imagen: **400**.

## 4. Sin señal

Usa el mismo **cuaderno del celular** que los cambios de estado (ver [frontend/PWA_SINCRONIZACION.md](./frontend/PWA_SINCRONIZACION.md)):

- Sin señal (o si la señal se corta mientras se manda, o si el almacén de fotos no responde), el comentario y sus fotos
  quedan guardados en el celular y se ven arriba del muro con **"Sin enviar"**.
- Se mandan **solos** cuando vuelve la señal (en Android, aunque FARO esté cerrado). Cada comentario lleva un número de
  operación (UUID): si llega dos veces, se guarda **una sola**.
- Si cuando llega la OT ya no existe o ya no es de la cuadrilla del capataz → aparece en el cartel de arriba con **"Entendido"**.
- La consulta sin conexión (`sin-conexion.html`) no tiene comentarios: solo muestra las tareas.

## 5. Dónde se guardan las fotos

En un **almacén aparte** con el estándar **S3** (no en Neon: la base tiene 1 GB y las fotos la llenarían enseguida).
En la base queda solo la "etiqueta" de cada foto (tabla `fotos_comentario`: nombre del archivo, tipo, tamaño).
Las fotos son **privadas**: no tienen dirección pública; se ven solo a través del backend y con sesión iniciada.

| Dónde | Almacén | Cómo se configura |
|---|---|---|
| En la compu (Docker) | **RustFS** (servicio `rustfs` de `docker-compose.yml`) | Dos líneas en el archivo `.env` de la raíz (punto 6) |
| En la compu, sin RustFS | **Memoria del backend** (`AlmacenEnMemoria`) | `FARO_ALMACEN=memoria` en el `.env` (punto 6, opción B). Solo para desarrollar |
| En Render | **Backblaze B2** (10 GB gratis) | Variables `FARO_S3_*` en Render ([DESPLIEGUE.md](./DESPLIEGUE.md#9-almacén-de-fotos-backblaze-b2)) |

Cambiar de proveedor (por ejemplo, a Cloudflare R2) es cambiar las variables; el código no cambia.
**Sin las claves** el backend arranca igual: todo FARO funciona y solo los pedidos con fotos responden **503**
("El almacén de fotos no está configurado...").

> ¿Por qué RustFS y no MinIO? MinIO dejó de publicar sus imágenes de Docker (`docker pull minio/minio` falla).
> RustFS habla el mismo idioma S3.

## 6. Probarlo en la compu

**Opción A — con RustFS (las fotos sobreviven a los reinicios).**

1. En el archivo **`.env`** de la raíz del repo (no se sube a GitHub; si no existe, crearlo) agregar dos líneas con valores
   que **inventa cada uno**: `FARO_S3_ACCESS_KEY=` (un nombre de usuario) y `FARO_S3_SECRET_KEY=` (una clave de 8 caracteres o más).
2. `docker compose up --build`. En `docker compose ps` tiene que aparecer **faro-rustfs** "Up".
   En `docker compose logs backend` tiene que aparecer: `Almacén de fotos S3: bucket 'faro-fotos' en http://rustfs:9000`.
3. Entrar a FARO (`http://localhost:5173`), abrir "Comentarios y fotos" de una OT, elegir fotos y **Publicar**.
4. Ver las fotos guardadas: consola de RustFS en `http://localhost:9001` (usuario y clave del `.env`) → bucket `faro-fotos`.
   El bucket se crea solo con la primera foto.
5. Sin señal: F12 → **Network** → cambiar **"No throttling"** por **"Offline"**, publicar un comentario (queda "Sin enviar")
   y volver a **"No throttling"**: se manda solo en unos segundos. Ojo: con el servidor de desarrollo (`npm run dev`) la
   pantalla sigue abierta pero **no se puede recargar** sin red (ver [PWA_CONSULTA_LOCAL.md](./frontend/PWA_CONSULTA_LOCAL.md#cómo-revisar));
   para probar recargas y cierre de FARO sin señal, usar `npm run pwa` (`http://localhost:4173`).

**Opción B — sin RustFS (`FARO_ALMACEN=memoria`).** Para quien no puede o no quiere levantar el depósito.
Las fotos se guardan en la memoria del backend: se publican y se ven igual que con S3, pero **se pierden cada vez que se reinicia el
backend** (por ejemplo, al reconstruir la imagen). Las fotos viejas, cuya fila sigue en la base, muestran "No se pudo cargar" (404).
Es normal; no es un error de la pantalla. Poner `FARO_ALMACEN=memoria` en el `.env` (ya viene así en `.env.example`) y
`docker compose up --build`; en el log del backend aparece el aviso `Almacén de fotos EN MEMORIA`.
Si el backend corre fuera de Docker: `$env:FARO_ALMACEN='memoria'; .\mvnw.cmd spring-boot:run`.

**Comprobar que las fotos se ven con la red activa** (descarta que el problema sea de la conexión): publicar un comentario con una
foto, ver que aparece en el muro y, en F12 → **Network**, que el pedido `/api/comentarios/fotos/<id>` responde **200** con tipo `image/*`.
Si responde 404, el backend se reinició después de publicar (con `memoria`) o la foto no está en RustFS.
Al estar en memoria, con la red cortada una foto que **no** se había abierto antes no se puede bajar: las respuestas de `/api` nunca
se guardan en el navegador (a propósito, son privadas). Las ya vistas se conservan mientras no se cierre la pestaña.

## 7. Backend (para quien lo mantenga)

| Endpoint | Qué hace | Respuestas |
|---|---|---|
| `GET /api/ordenes-trabajo/{ordenId}/comentarios` | El muro, del más nuevo al más viejo (con autor, fotos y `puedeBorrar`) | 200 · 403 · 404 |
| `PUT /api/ordenes-trabajo/{ordenId}/comentarios/{operacionId}` | Escribir. **multipart**: `texto`, `hechoEn` (ISO), `fotos` (repetido) | 200 · 400 · 409 · 413 · 503 |
| `GET /api/comentarios/fotos/{fotoId}` | Los bytes de la foto (`Cache-Control: private`, 1 día) | 200 · 403 · 404 · 503 |
| `DELETE /api/comentarios/{comentarioId}` | Borra el comentario y sus fotos | 204 · 403 · 404 |

- Es **PUT con el número de operación** (como `/api/sincronizacion`): mandar dos veces lo mismo no duplica.
  Si el número ya se usó en otra OT o por otra persona → 409.
- 409 con `errores.motivo`: `ORDEN_NO_EXISTE` u `OTRA_CUADRILLA` (el celular muestra "Entendido").
- Orden de guardado: primero se suben las fotos al almacén y **después** se guarda el comentario en la base
  (si el almacén falla, no queda un comentario con fotos que no existen). Al borrar: primero la base, después el almacén.
- Archivos: `config/AlmacenConfig`, `services/AlmacenArchivos` (+ `AlmacenS3`, `AlmacenEnMemoria`, `AlmacenSinConfigurar`),
  `services/ComentarioService`, `controllers/ComentarioController`, `models/ComentarioOrden`, `models/FotoComentario`.
  Nombre de cada foto en el almacén: `comentarios/{operacionId}/{posición}.jpg`.
- El JWT va en el header `Authorization`, por eso el frontend no puede usar `<img src="/api/...">`: baja cada foto con
  `fetch` y la muestra desde un `blob:` (`components/FotoProtegida.jsx`).
