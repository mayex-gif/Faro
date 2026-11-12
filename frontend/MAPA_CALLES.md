# Mapa: pestaña Calles y carga de las calles del pueblo

El mapa tiene tres pestañas arriba: **Todo el pueblo**, **Luminarias** y **Calles**. Esta guía explica la pestaña
Calles, cómo se dibujan las calles y cómo se cargan todas de una vez. Las luminarias están en `MAPA_LUMINARIAS.md`.

## Cómo se dibujan las calles (`components/MapaLugares.jsx`)

- Cada calle es un grupo de dos líneas: un **borde blanco** debajo y la **línea de color** encima (como un mapa de rutas).
  Así no se confunden con los bordes de las plazas y se tocan más fácil con el dedo.
- El color es el de la OT abierta más urgente (o su estado, según "Colorear por"); gris si no tiene trabajos.
  Las calles con trabajos son más anchas.
- **Sin rectángulo al tocarla:** Chrome le ponía el contorno de foco a la línea (SVG) y se veía un rectángulo
  alrededor de la calle. Se saca con CSS en `estilos-mapa.css` (`.mapa path.leaflet-interactive:focus`).
  Las marcas del mapa no se recorren con el teclado: la lista de al lado tiene los mismos datos.

## Pestaña Calles (`pages/PaginaMapa.jsx`, `components/PanelCalles.jsx`, `utils/calles.js`)

- El mapa muestra solo las calles. Como en Luminarias, usa **todas** las OT abiertas (los filtros de "Todo el pueblo" no cuentan).
- Panel de la izquierda (en el celular, "Ver como lista"): cuántas calles hay, cuántas tienen trabajos abiertos,
  cuántas están fuera de servicio (si hay), un buscador (sin importar tildes ni mayúsculas) y dos listas:
  **Con trabajos abiertos** (las más urgentes arriba, con "OT #12 · Bacheo · Urgente") y **Sin trabajos** (por nombre).
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
