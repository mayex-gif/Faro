# Mapa: pestaña Calles, tramos de calle y carga de las calles del pueblo

El mapa tiene tres pestañas arriba: **Todo el pueblo**, **Luminarias** y **Calles**. Esta guía explica la pestaña
Calles, cómo se dibujan las calles, los **tramos de calle de una OT** y cómo se cargan todas las calles de una vez.
Las luminarias están en `MAPA_LUMINARIAS.md`.

## Cómo se dibujan las calles (`components/MapaLugares.jsx`)

- Cada calle es un grupo de dos líneas: un **borde blanco** debajo y la **línea de color** encima (como un mapa de rutas).
  Así no se confunden con los bordes de las plazas y se tocan más fácil con el dedo.
- Una calle **sin trabajos** es gris y más finita, y **solo se ve en la pestaña Calles**.
- Una calle **con trabajos** se dibuja **tramo por tramo**: una línea por cada OT abierta, con el color de esa OT
  (prioridad o estado, según "Colorear por"), la más urgente encima. Si la OT no tiene tramo (toda la calle o
  "por altura"), su línea es la calle entera. En la pestaña Calles, debajo de los tramos va la calle entera en gris;
  en "Todo el pueblo", solo los tramos. Ver "Tramos de calle de una OT" más abajo.
- **Sin rectángulo al tocarla:** Chrome le ponía el contorno de foco a la línea (SVG) y se veía un rectángulo
  alrededor de la calle. Se saca con CSS en `estilos-mapa.css` (`.mapa path.leaflet-interactive:focus`).
  Las marcas del mapa no se recorren con el teclado: la lista de al lado tiene los mismos datos.

## Pestaña Calles (`pages/PaginaMapa.jsx`, `components/PanelCalles.jsx`, `utils/calles.js`)

- El mapa muestra solo las calles. Como en Luminarias, usa **todas** las OT abiertas (los filtros de "Todo el pueblo" no cuentan).
- Panel de la izquierda (en el celular, "Ver como lista"): cuántas calles hay, cuántas tienen trabajos abiertos,
  cuántas están fuera de servicio (si hay), un buscador (sin importar tildes ni mayúsculas) y dos listas:
  **Con trabajos abiertos** (las más urgentes arriba, con "OT #12 · Bacheo · Urgente · entre Catamarca y La Rioja")
  y **Sin trabajos** (por nombre).
- **"Todo el pueblo" no muestra las calles sin trabajos** (`utils/calles.js` → `sinCallesVacias`), para que no quede
  tan cargado. La única excepción es la calle elegida (por ejemplo, si se la buscó con el buscador de arriba).
- "Agregar calle" abre el formulario solo para calles. "Nueva OT acá" y "Volver al mapa" vuelven a esta pestaña
  (`params.pestana = 'calles'`).
- Estilos propios: `estilos-calles.css`. En celulares chicos (≤ 480 px) las pestañas no llevan icono, para que entren las tres.

## "Agregar lugar" (`utils/lugares.js` → `tiposParaAgregar`)

| Pestaña         | Botón              | Qué se puede elegir                                                 |
|-----------------|--------------------|---------------------------------------------------------------------|
| Todo el pueblo  | Agregar lugar      | Lugar, Calle o Luminaria (al elegir Luminaria pasa a esa pestaña)   |
| Luminarias      | Agregar luminaria  | Solo luminaria                                                      |
| Calles          | Agregar calle      | Solo calle                                                          |

"Lugar" es el tipo `ESPACIO_VERDE` del backend (plazas, espacios verdes): antes se mostraba como "Área".
El valor guardado no cambió. El botoncito de filtro se llama "Otros lugares".

## Tramos de calle de una OT

Analogía: la calle es un **tren** y cada cuadra un **vagón**. Una OT puede ser de todo el tren o de algunos vagones
(incluso desde la mitad de un vagón). La calle sigue siendo **un solo lugar**: el tramo se guarda en la OT.

### Backend (`OrdenTrabajo.tramo`, `services/TramoDeCalle.java`)

- Columna nueva **opcional** `ordenes_trabajo.tramo` (`geometry(Geometry, 4326)`): una línea GeoJSON (LineString).
  `null` = toda la calle (o el lugar no es una calle). La crea `ddl-auto=update`; las OT viejas quedan con `null`.
- Viaja como `tramo` en el pedido y en la respuesta de la OT (`OrdenTrabajoRequestDTO`, `OrdenTrabajoDTO`), también
  en el alta sin señal (`/api/sincronizacion/altas-orden`).
- `TramoDeCalle.validar` (errores 400 en `errores.tramo`): solo lugares `CALLE`; una línea con inicio y fin distintos;
  tiene que caer sobre la calle con **~5 m** de margen (`buffer(0.00005°)`); se guarda con 6 decimales.
  "Por altura" + tramo → 400 (por altura no lleva tramo).
- **El PUT reemplaza todo:** si la pantalla no manda el tramo, se borra. Por eso el formulario lo manda siempre.
- Los nombres de "entre calles" (`calleEntre1/2`, de #67) se siguen guardando como texto; el backend no revisa que
  crucen (eso lo filtra el front).

### Reglas del front (funciones puras, con tests)

| Archivo | Qué hace |
|---|---|
| `utils/tramos.js` | Geometría en metros: esquinas de una calle (`crucesDe`), llevar un toque a la calle (`proyectar`), pegar a la esquina (`pegarAEsquina`), cortar el tramo (`cortar`), calles que lo limitan (`callesQueLimitan`), tramo entre dos calles (`tramoEntre`), textos (`textoTramo`, `textoDePunto`) y los dos toques del mapa (`tocarTramo`, `pedidoDeTramo`). |
| `utils/ubicacionEnCalle.js` | "Ubicación dentro de la calle" del formulario: modo inicial, qué calles ofrecer, validación y lo que se manda al backend. |
| `utils/calles.js` | Lo que muestra el mapa: tramo y texto de cada OT abierta (`conTramos`, `tramoDeLaOrden`, `ubicacionDeLaOrden`) y "Todo el pueblo" sin calles vacías (`sinCallesVacias`). |

Números que conviene conocer:

| Constante | Valor | Para qué |
|---|---|---|
| `TOLERANCIA_CRUCE_M` | 8 m | Dos calles que pasan a ≤ 8 m se cruzan (esquinas en "T" y calles dibujadas a mano que no tocan justo). |
| `PEGAR_ESQUINA_M` | 15 m | Un toque a ≤ 15 m de una esquina se pega a ella. |
| `SEPARACION_MAXIMA_M` | 25 m | Un toque a más de 25 m de la calle no cuenta ("Tocá sobre ..."). |
| `ZOOM_MINIMO_TRAMO` | 16 | Al marcar, el mapa no se aleja más que esto (en el celular una calle larga se recorre arrastrando). |

- Las esquinas se calculan **cortando segmentos**, no comparando coordenadas: las calles de OpenStreetMap comparten
  los puntos de las esquinas, pero las dibujadas a mano no. Una calle que cruza dos veces aparece dos veces; otra calle
  con el mismo nombre se ignora.
- **Calles "lógicas" para "Entre calles":** las que cruzan el tramo por dentro, y si empieza (o termina) en la mitad
  de una cuadra, la esquina anterior (o la siguiente). Ej.: Buenos Aires desde la mitad entre Santiago del Estero y
  Córdoba hasta La Rioja → La Rioja, Catamarca, Santiago del Estero, Córdoba.

### Marcar el tramo en el mapa (`components/ElegirTramo.jsx`, `pages/PaginaMapa.jsx`, `components/MapaLugares.jsx`)

1. En la ficha de una calle, "Nueva OT acá" abre **"¿Dónde es el trabajo?"** (en el lugar de la ficha en la compu;
   en una hoja desde abajo en el celular). En otros lugares (plazas, luminarias) va directo al formulario.
2. **Toda la calle** → formulario sin tramo. **Un tramo** → la calle se resalta, el resto se atenúa y las esquinas
   llevan el nombre de la calle que cruza. Toque 1 = desde, toque 2 = hasta (un tercero empieza de nuevo).
   Vista previa en naranja; "Deshacer", "Elegir otra vez", "Volver"; Escape cancela.
3. **Seguir** → `onNavegar('ordenes', { lugarId, desde: 'mapa', pestana, tramo, calleEntre1, calleEntre2 })`.
   Si el tramo va de punta a punta, es toda la calle (`tramo: null`).

- Sobre la calle hay una franja invisible de 36 px para que sea fácil tocarla con el dedo.
- En el celular la hoja de abajo queda chica mientras se marca y el aviso ("Tocá sobre ...") no se come los toques.

### Formulario de OT (`components/FormularioOrden.jsx`)

| Modo | Cuándo aparece | Qué se guarda |
|---|---|---|
| Toda la calle | siempre (antes "Sin detalle") | sin tramo, sin calles |
| Tramo marcado | si vino un tramo del mapa o la OT ya tenía uno | el tramo; "Entre calle / Y calle" opcionales (solo las que lo limitan; van las dos o ninguna). "Usar toda la calle" lo saca. |
| Entre calles | siempre | las dos calles (**solo las que cruzan**) y el tramo de esquina a esquina (`tramoEntre`). Si la calle no cruza con ninguna, avisa. |
| Por altura | siempre | la altura, sin tramo |

- Al cambiar de lugar se borra la ubicación (era de la otra calle).
- **OT viejas** con "entre calles" pero sin tramo: el mapa calcula el tramo en el momento (`tramoDeLaOrden`); al
  editarlas y guardarlas, el formulario les guarda el tramo.

### Pendientes (no están en la demo)

- La **historia del lugar** no dice el tramo: los eventos de la OT (`EventoOrden`) no guardan la ubicación.
- La tabla de **Trabajos** (`TablaOrdenes.jsx`) sigue mostrando "Entre X y Y" / "Altura" (no el texto del tramo).
- Una **programación** (mantenimiento periódico) no guarda tramo: sus OT son de toda la calle.

## Carga de las calles del pueblo (`backend/.../config/InicializadorCalles.java`)

- Las 24 calles de Estación General Paz están en `backend/src/main/resources/datos/calles-estacion-general-paz.geojson`.
  Se bajaron **una sola vez** de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL) y quedan en el
  repositorio: el backend no se conecta a OpenStreetMap.
- Al arrancar, el backend las crea como calles que funcionan. En "Datos técnicos" dicen que vienen de OpenStreetMap.
- **Corre una sola vez:** si ya hay alguna calle traída de OpenStreetMap, no hace nada. Así, una calle borrada a propósito
  no vuelve en el siguiente reinicio.
- **No duplica:** si ya hay una calle con el mismo nombre (sin importar tildes ni mayúsculas), la saltea.
- Se apaga con la variable `FARO_CARGAR_CALLES=false` (los tests la apagan en `src/test/resources/config/application.properties`).
- Si el archivo falta o está mal, lo avisa en el log y el backend arranca igual.
- No están las rutas (RN9 y el camino a General Paz). Se pueden agregar a mano con "Agregar calle".
- Algunas calles venían en varios tramos en OpenStreetMap (Salta, La Rioja, Santa Fe). Se unieron en una sola línea
  para que se puedan editar desde Infraestructura.

### Actualizar el archivo

Si hace falta volver a bajarlas (calles nuevas en OpenStreetMap), sirve una consulta a la API Overpass como esta
(las rutas, como la RN9, se descartan):

```
[out:json][timeout:60];
way["highway"~"^(residential|tertiary|secondary|unclassified|living_street)$"]["name"]
  (-31.1420,-64.1490,-31.1270,-64.1350);
out geom;
```

Después hay que agrupar los tramos por nombre, unirlos en una sola línea por calle y guardar `nombre`, `osm` (ids) y la
geometría con el mismo formato del archivo. **Ojo:** como la carga corre una sola vez, en una base donde ya se hizo
las calles nuevas del archivo no se agregan solas; ahí se cargan con "Agregar calle".
