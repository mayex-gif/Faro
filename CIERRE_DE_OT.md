# Finalizar y cancelar una orden de trabajo (Sprint 4 · pop-up de cierre)

Cuando una OT se **finaliza** sale un pop-up para contar cómo quedó el trabajo: si el lugar quedó funcionando, cuánto
se gastó en total, un comentario y fotos de evidencia. Cuando se **cancela**, un pop-up chico pide el motivo.
**Nada es obligatorio** y **todo anda sin señal**.

## 1. Quién puede qué

| Acción | Encargado | Capataz | Mesa de entradas |
|---|:-:|:-:|:-:|
| Finalizar o cancelar desde **Trabajos** | ✓ (todas) | — (no entra a Trabajos) | ✗ |
| Finalizar o cancelar desde **Mis tareas** | ✓ (eligiendo la cuadrilla) | solo OT de su cuadrilla | ✗ |
| Hacerlo **sin señal** (queda en el cuaderno del celular) | ✗ (ve el error y no pierde lo escrito) | ✓ | ✗ |

Son los mismos permisos de `PATCH /api/ordenes-trabajo/{id}/estado` (ver `LOGIN_Y_ACCESOS_BACKEND.md` §9).

## 2. El pop-up de "Finalizar"

Se abre con **"Pasar a Finalizada"** (Trabajos) o **"Finalizar tarea"** (Mis tareas). Reemplaza al cartel de confirmación del navegador.

| Parte | Qué hace |
|---|---|
| **"El lugar quedó funcionando"** (casilla) | Aparece **solo si el lugar está "Fuera de servicio"** (cualquier tipo: luminaria, calle o lugar). Viene **marcada**, salvo que el lugar tenga **otros trabajos abiertos**: ahí viene desmarcada con el aviso "Este lugar tiene N trabajo(s) abierto(s) más". Marcada → el lugar vuelve a "Funciona"; desmarcada → queda como está. Una luminaria **a futuro** nunca se toca. |
| **"Monto aproximado declarado: $ X"** | El presupuesto que se cargó al crear la OT (o "No se declaró un monto"). No se cambia acá. |
| **"¿Cuánto se gastó en total?"** | El **gasto real** (`gastoReal`). **Viene cargado con el monto declarado** (vacío si no se declaró) y se corrige **hacia arriba o hacia abajo**. Debajo: "Contá también nafta, materiales o repuestos." y la **diferencia en vivo**: "Se gastó $ 5.000 menos de lo declarado" / "Se gastó $ 3.000 más de lo declarado" / "Lo mismo que se declaró". Número ≥ 0, hasta 12 enteros y 2 decimales; acepta `8000`, `8000,50` u `8000.50`. Rechaza `8.000` (en Argentina es ocho mil: se pide sin puntos de miles). Si se deja como vino, se guarda igual (queda confirmado que se gastó lo declarado); si se borra, no se informa. |
| **Comentario y fotos** | Se guardan como un **comentario de la OT** (el mismo muro de [COMENTARIOS_Y_FOTOS.md](./COMENTARIOS_Y_FOTOS.md)): hasta 1000 caracteres y 5 fotos, achicadas en el celular. |

- **"Finalizar la OT"** manda **primero el comentario** (si hay) y **después el cambio de estado**. Si el comentario falla, la OT sigue
  abierta y lo escrito queda en el pop-up para reintentar. Si el comentario llegó y falla el cambio de estado, al reintentar el comentario
  **no se repite** (usa el mismo número de operación).
- En la compu es una ventana en el medio; en el celular ocupa toda la pantalla con los botones siempre a la vista abajo.
- Foco: al abrir va al título; **Tab** no se escapa de la ventana; **Escape** o "Volver" cierran y el foco vuelve al botón que la abrió.
  **No** se cierra tocando afuera (para no perder lo escrito por un toque sin querer).

## 3. El pop-up de "Cancelar"

Se abre con **"Pasar a Cancelada"**. Pide un **motivo opcional** (hasta 974 caracteres): si se escribe, queda como comentario
**"Motivo de la cancelación: …"**. Sin casilla, sin gasto, sin fotos: **el lugar queda como está**.
En el celular es una hoja que sube desde abajo.

## 4. Sin señal (capataz)

- El comentario (con sus fotos) y el cambio de estado (con la casilla y el gasto total) van al **cuaderno del celular**, en ese orden
  (el comentario un milisegundo antes: el cartero manda primero lo más viejo). Ver [frontend/PWA_SINCRONIZACION.md](./frontend/PWA_SINCRONIZACION.md).
- El cartel del cuaderno dice qué se va a mandar: *"OT #5: pasar a Finalizada (El lugar queda funcionando · Gasto total $ 15.000)"*.
- "Aplicar igual" (después de un conflicto) conserva la casilla y el gasto.
- Si al volver la señal **otra persona ya había finalizado la OT**: no es un conflicto; si la OT todavía no tenía gasto total, se guarda
  el del capataz (si ya tenía, queda el primero que llegó). La casilla en ese caso **no** se aplica (el que la cerró ya decidió).
- Comandas viejas (de antes del pop-up) llegan sin casilla ni gasto: el backend hace lo de antes (una luminaria vuelve sola a "Funciona").
- Comandas que quedaron en el cuaderno con el pop-up anterior ("¿Hubo algún otro gasto?", `gastoAdicional`) se siguen mandando
  tal cual: el backend guarda gasto total = monto declarado + gasto adicional. El cartel las muestra como "Gasto adicional $ X".

## 5. Dónde se ve después

| Dónde | Qué |
|---|---|
| **Trabajos** (tabla) | Debajo del estado: "Gastado $ 15.000 (−$ 5.000)" (la diferencia con lo declarado; sin monto declarado, solo "Gastado $ 15.000"). |
| **Ficha histórica** del lugar (línea de tiempo) | En "Pasó a Finalizada": "El lugar volvió a funcionar · Se gastó $ 15.000 ($ 5.000 menos de lo declarado)" (o "El lugar siguió fuera de servicio"). |
| **Comentarios y fotos** de la OT | El comentario y las fotos del cierre, o "Motivo de la cancelación: …". |
| **Reportes** | Indicador **"Total gastado en OTs finalizadas"** = lo gastado en total, con "Declarado $ 20.000 · Diferencia −$ 5.000" debajo (una OT finalizada sin gasto informado cuenta lo declarado). Gráfico **"Monto gastado"**: dos barras por período, **una al lado de la otra** (verde: declarado; naranja: gastado), con la diferencia en el globo y en la tabla. |
| **CSV "Trabajos finalizados"** | Columnas **"Monto Aproximado Declarado"**, **"Gasto Real"** y **"Diferencia"** (si no se informó el gasto, las dos últimas quedan vacías). |

## 6. Probarlo en la compu

1. `docker compose up --build` (el backend cambió: las columnas nuevas las crea `ddl-auto` al arrancar).
2. Como **encargado**: Trabajos → una OT "En curso" cuyo lugar esté "Fuera de servicio" → "Pasar a Finalizada" → marcar la casilla,
   corregir el gasto total (ej. de `20000` a `15000`: debajo dice "Se gastó $ 5.000 menos de lo declarado"), un comentario y una
   foto → "Finalizar la OT". Ver: el gasto debajo del estado, el lugar en "Funciona" (mapa o
   Infraestructura), la ficha histórica y Más → Reportes.
3. Como **capataz** (Mis tareas): lo mismo con "Finalizar tarea". Para la casilla desmarcada, crear otra OT abierta en el mismo lugar.
4. **Sin señal**: F12 → **Network** → "Offline" → finalizar con comentario y gasto → aparece "Sin enviar" y el cartel con el detalle →
   volver a "No throttling" → se manda solo.
5. **Cancelar**: "Pasar a Cancelada" → escribir un motivo → aparece en "Comentarios".

## 7. Backend (para quien lo mantenga)

| Endpoint | Body | Respuestas |
|---|---|---|
| `PATCH /api/ordenes-trabajo/{id}/estado` | `{ estadoId, lugarFunciona?, gastoReal?, gastoAdicional? }` | 200 · 400 · 403 · 404 · 409 |
| `PUT /api/sincronizacion/cambios-estado/{operacionId}` | `{ ordenId, estadoId, estadoAnteriorId, hechoEn, lugarFunciona?, gastoReal?, gastoAdicional? }` | 200 · 400 · 409 |

- `lugarFunciona`, `gastoReal` y `gastoAdicional` solo valen al **finalizar** (estado de cierre que no es una cancelación; "Cancelada"
  se reconoce por el nombre). En otro cambio de estado → **400** (`errores.lugarFunciona` / `errores.gastoReal` / `errores.gastoAdicional`).
  Gasto negativo o con más de 2 decimales → 400.
- **`gastoReal`** = cuánto se gastó en total. **`gastoAdicional`** es el dato del pop-up anterior ("lo que se gastó de más"): se sigue
  aceptando para las pantallas guardadas por el service worker y las comandas del cuaderno. Si llega solo, se guarda
  `gastoReal = (montoAproximado ?? 0) + gastoAdicional`; si llegan los dos, gana `gastoReal` (`CambioEstadoRequestDTO.gastoTotal`).
  La respuesta (`OrdenTrabajoDTO`) trae `gastoReal` (ya no `gastoAdicional`).
- `lugarFunciona`: `true` → `estadoOperativo = true`; `false` → no se toca; **sin el dato** → lo de antes (luminaria → Funciona, el resto no).
  Una luminaria a futuro (`instalada = false`) nunca se toca. Lógica: `OrdenTrabajoService.dejarElLugarComoDijeron`.
- Sin el dato del gasto **no se borra** uno que ya tenía la OT.
- Columnas (las crea `ddl-auto=update`; no son enums, no aplica la trampa del `CHECK`): `ordenes_trabajo.gasto_real`,
  `eventos_orden.gasto_real`, `eventos_orden.lugar_funciona`. Las columnas viejas `gasto_adicional` (de la primera versión del pop-up)
  quedan en la base sin usar: al arrancar, `config/InicializadorGastoReal` pasa una sola vez las filas que tenían gasto adicional
  al gasto real con la misma cuenta (en una base nueva no hace nada).
- La bitácora (`EventoOrden.finalizacion`) guarda el gasto y si el lugar **volvió a funcionar** (`true`), **siguió fuera de servicio**
  (`false`) o no corresponde (`null`: ya funcionaba). La historia (`EventoHistoriaDTO`) los devuelve como `gastoReal`, `montoAproximado` (lo declarado,
  solo si hay gasto) y `lugarFunciona`.
- "Ya estaba así" sin señal: `SincronizacionService.guardarElGastoQueFaltaba`.
- Reportes: `ReporteRepository.sumarGastosReales` (`SUM(COALESCE(gasto_real, monto_aproximado))`) y las series
  `sumarMontosPor{Dia,Semana,Mes}` devuelven `[período, monto declarado, gasto total]`; `DashboardGerencialDTO` trae
  `montoAproximadoTotal`, `gastoRealTotal` y `diferenciaGastoTotal`; `MontoPorPeriodoDTO` trae `montoAproximado`, `gastoReal` y
  `diferencia`. CSV en `ExportacionCsvService` ("Monto Aproximado Declarado", "Gasto Real", "Diferencia").

## 8. Frontend (para quien lo mantenga)

| Capa | Archivo |
|---|---|
| Reglas (sin React, con tests) | `src/utils/cierreOrden.js` → `tests/cierreOrden.test.js` |
| Envío (comentario + estado) | `src/api/cierreOrden.js` (`enviarCierre`) → `tests/enviarCierre.test.js` |
| Pop-ups | `src/components/PopUpFinalizar.jsx`, `src/components/PopUpCancelar.jsx`, estilos en `src/estilos-cierre.css` |
| Comportamiento de ventana | `src/hooks/useDialogo.js` (foco, Escape, Tab, página de atrás quieta) |
| Fotos elegidas | `src/hooks/useFotosElegidas.js` (achicar + vista previa) |
| Páginas | `src/pages/PaginaOrdenes.jsx` (Trabajos), `src/pages/PaginaMisTareas.jsx` (carga los lugares con `listarPuntos()` para saber si están fuera de servicio y los recuerda para usar sin señal) |
| Sin señal | `src/offline/datosCola.js` (`crearCambioEstado(..., { datosCierre })`, `cuerpoDeEnvio`), cartel en `src/components/AvisoCambiosPendientes.jsx` |
| Mostrar el gasto | `src/components/TablaOrdenes.jsx` + `src/utils/cierreOrden.js` (`textoGastoDeLaOrden`), `src/utils/historia.js` (`cierreDelEvento`, `textoGastoDelEvento`) + `src/components/LineaDeTiempo.jsx`, `src/utils/reportes.js` (`resumenGastos`, `serieMontos`) + `src/components/GraficoMontos.jsx` + `src/pages/PaginaReportes.jsx` |

Los colores del gráfico de montos (`COLORES_MONTOS` en `utils/reportes.js`: declarado `#1F8A6A`, gastado `#C2571A`) se validaron
juntos con el validador de paleta de la skill `dataviz` (también para daltonismo: ΔE 10,7 en deuteranopía).
