# Pestaña Luminarias y luminarias a futuro

Pedido del municipio: el intendente quiere ver **qué luminarias tiene, cuáles andan, cuáles no y cuáles faltan poner**.
FARO lo resuelve con una **pestaña aparte del mismo mapa** ("Todo el pueblo | Luminarias") y una **sección propia**
para cargarlas (Más → Luminarias). Infraestructura queda para espacios verdes y calles.

## 1. Qué ve cada uno

| | Encargado | Mesa de entradas | Capataz |
|---|---|---|---|
| Pestaña Luminarias del mapa (postes, %, zonas, modo noche) | Sí | Sí | Sí |
| Cambiar una luminaria entre Funciona y Apagada (ficha) | Sí | No | No |
| "Crear OT de arreglo" desde la ficha | Sí | Sí | No |
| Cargar una luminaria a futuro y "Marcar como instalada" | Sí | No | No |
| Más → Luminarias (alta, edición y baja) | Sí | No | No |

Por ahora las luminarias a futuro las carga y activa el **encargado**. Cuando exista el **rol Intendente** (backlog de Trello)
estas acciones pasan a él: en el front son `puedeCargarLuminariaAFuturo` y `puedeCambiarEstadoLuminaria` (`utils/permisos.js`);
en el backend, el `@PreAuthorize` del PUT y el control del POST en `PuntoInfraestructuraController`.

## 2. Los cuatro estados (cómo se calculan)

El estado **no se guarda**: el front lo calcula con los datos del lugar y sus OT abiertas (`utils/luminarias.js → estadoLuminaria`).

| Estado | Regla (en este orden) | Dibujo en el mapa |
|---|---|---|
| **A futuro** | `instalada === false` | poste "fantasma", base punteada |
| **En arreglo** | no funciona (`estadoOperativo === false`) **y** tiene alguna OT abierta | base amarilla, insignia de llave |
| **Apagada** | no funciona y **no** tiene OT abierta | base roja, lámpara apagada, insignia ✕ |
| **Funciona** | el resto (aunque tenga una OT abierta, por ejemplo un mantenimiento) | base verde, lámpara prendida |

- El **porcentaje** es sobre las **instaladas**: las luminarias a futuro no cuentan.
- **"¿Dónde falta luz?"**: el pueblo se parte en 4 cuadrantes desde el centro de todas las luminarias
  (`zonasDeLuminarias`). Primero la zona con menos luminarias andando. Si algún día hay barrios reales, se cambia esa función
  y la pantalla no se toca (devuelve `{ clave, nombre, limites, cuenta, porcentaje }`).
- El estado sale de **todas** las OT abiertas: los filtros de la pestaña "Todo el pueblo" no lo cambian.

## 3. Reglas del backend

| Regla | Dónde | Respuesta |
|---|---|---|
| Campo nuevo `instalada` (Boolean) en `PuntoInfraestructura`. Los lugares viejos tienen `null` y **cuentan como instalados** (el DTO siempre manda `true` o `false`). | modelo, DTOs, `PuntoInfraestructuraService` | — |
| Solo una **luminaria** puede quedar a futuro. | `PuntoInfraestructuraService.validarInstalada` | 400 `errores.instalada` |
| Una luminaria a futuro **no lleva OT** (crear, modificar, sincronización sin señal) **ni mantenimiento periódico** (crear/modificar regla). | `PuntoInfraestructuraService.validarQueAdmiteTrabajos`, usada en `OrdenTrabajoService.copiarDatos` y `ReglaMantenimientoService` | 400 `errores.lugarId` |
| Una luminaria que ya tuvo OT no puede volver a "a futuro". | `PuntoInfraestructuraService.modificarLugar` | 409 |
| Cargar una luminaria a futuro (POST con `instalada: false`) es solo del encargado. | `PuntoInfraestructuraController.crear` | 403 |
| Al **finalizar** (no cancelar) una OT, el pop-up pregunta "El lugar quedó funcionando" (si estaba fuera de servicio): marcada → `estadoOperativo = true`. Sin el dato (pantallas o comandas viejas), una luminaria instalada vuelve sola a funcionar, como antes. "Cancelada" se reconoce por el nombre, como en los reportes. Ver `CIERRE_DE_OT.md`. | `OrdenTrabajoService.cambiarEstado` → `dejarElLugarComoDijeron` | — |

La columna `instalada` la crea sola `ddl-auto=update` (no es un enum, así que no aplica la trampa del `CHECK` de Hibernate).

## 4. Qué se puede hacer en pantalla

- **Pestaña Luminarias** (`pages/PaginaMapa.jsx`): pestañas arriba del mapa, postes (`utils/poste.js`), leyenda que filtra
  ("Mostrar en el mapa"), panel de la izquierda (`components/PanelLuminarias.jsx`), botón "Modo noche"
  (se recuerda en el navegador: `localStorage` `faro-mapa-noche`).
- **Ficha de la luminaria** (`components/EstadoLuminaria.jsx`, dentro de `PanelLugar`): Funciona / Apagada (guarda en el momento
  con `PUT /api/infraestructura/{id}`), "Crear OT de arreglo" (la OT arranca con tipo Alumbrado y "Volver al mapa" vuelve a esta
  pestaña) y, si es a futuro, "Marcar como instalada" (queda Funciona). Una luminaria a futuro no muestra "Nueva OT acá".
- **Agregar**: "Agregar luminaria" en la pestaña Luminarias, "Agregar lugar" (Lugar, Calle o Luminaria; al elegir Luminaria pasa a esta pestaña) en "Todo el pueblo",
  y "Agregar luminaria a futuro" en la sección "A futuro" del panel.
- **Más → Luminarias** (`pages/PaginaLuminarias.jsx` = `PaginaInfraestructura` con `categoria="luminarias"`): sin columna ni
  filtro de tipo, filtro por "A futuro", casilla "Luminaria a futuro" (apaga "Funciona correctamente").
- Los formularios de **OT** y de **mantenimiento periódico** no ofrecen luminarias a futuro.

## 5. Archivos, por capa

| Capa | Archivos |
|---|---|
| Backend · modelo / DTO | `models/PuntoInfraestructura.java`, `dto/PuntoInfraestructuraDTO.java`, `dto/PuntoInfraestructuraRequestDTO.java` |
| Backend · service | `PuntoInfraestructuraService.java`, `OrdenTrabajoService.java`, `ReglaMantenimientoService.java` |
| Backend · controller | `PuntoInfraestructuraController.java` |
| Front · reglas | `utils/luminarias.js` (estados, conteos, zonas, filtros), `utils/poste.js` (dibujo), `utils/lugares.js` (categorías, "A futuro"), `utils/filtros.js`, `utils/permisos.js`, `utils/navegacion.js`, `utils/ayuda.js` |
| Front · componentes | `PanelLuminarias.jsx`, `EstadoLuminaria.jsx`, `DefinicionesPoste.jsx` (degradés del poste), `MapaLugares.jsx`, `PanelLugar.jsx`, `TarjetaLugar.jsx`, `FormularioLugarMapa.jsx`, `FormularioPunto.jsx`, `FiltrosPuntos.jsx`, `TablaPuntos.jsx`, `FormularioOrden.jsx`, `FormularioRegla.jsx`, `Icono.jsx` |
| Front · páginas | `PaginaMapa.jsx`, `PaginaLuminarias.jsx`, `PaginaInfraestructura.jsx`, `PaginaOrdenes.jsx` |
| Estilos | `estilos-luminarias.css` |
| Tests | backend: `PuntoInfraestructuraServiceTest`, `PuntoInfraestructuraControllerTest`, `PermisosInfraestructuraTest`, `OrdenTrabajoServiceTest`, `OrdenTrabajoServiceEstadoTest`, `ReglaMantenimientoServiceTest` · front: `luminarias`, `poste`, `categoriasLugar`, `filtrosPuntos`, `permisos`, `navegacion`, `ayuda` |

## 6. Cómo probarlo

1. `docker compose up --build` (el backend cambió). Hace falta `FARO_JWT_SECRET` en el `.env` (copiala de `.env.example`).
2. Entrar como encargado → Mapa → pestaña **Luminarias**.
3. Tocar una luminaria → "Apagada" → aparece roja y en "Apagadas sin arreglo" → "Crear OT de arreglo" → crearla →
   pasa a "En arreglo" → finalizar la OT (En curso → Finalizada) dejando marcada "El lugar quedó funcionando" → vuelve a "Funciona".
4. "Agregar luminaria a futuro" → tocar el mapa → registrar → aparece en "A futuro" sin "Nueva OT acá" →
   "Marcar como instalada" → queda "Funciona".
5. Más → Luminarias e Infraestructura: cada una muestra lo suyo.
6. Probar "¿Dónde falta luz?", las casillas de "Mostrar en el mapa" y "Modo noche" (también en el celular, con F12 → modo dispositivo).

## 7. Pendiente / para charlar

- **Rol Intendente**: hoy no existe. Agregarlo implica destrabar la regla `usuarios_rol_check` de Postgres (Hibernate creó
  un `CHECK` con los 3 roles actuales y `ddl-auto=update` no lo actualiza) en cada base: local, Neon y la de la demo.
- **Zonas reales** (barrios) en lugar de cuadrantes.
- **Días que lleva apagada**: hoy no se guarda desde cuándo está fuera de servicio (se podría sacar de la Auditoría).
- Choques con los PR de Alejo: **#67** (→ develop) comparte `OrdenTrabajoService.java` y `FormularioOrden.jsx`
  (se probó juntarlos: sin conflictos); **#68** (→ demo) comparte 7 archivos del mapa y de los formularios de lugares.
