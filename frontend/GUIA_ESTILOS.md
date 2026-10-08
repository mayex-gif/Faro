# Guía de interfaz de FARO

Esta guía documenta la base visual de Infraestructura y Órdenes de trabajo.
Sirve para mantener coherencia al desarrollar los siguientes módulos.
No agrega funcionalidades al alcance aprobado.

## Criterio de diseño

El usuario del corralón necesita identificar un lugar, registrar sus datos y consultar
su estado con pocos pasos. Por eso la pantalla presenta un título claro, un formulario
dividido en información y ubicación, y un listado con acciones explícitas.

- RNF01 (usabilidad): etiquetas visibles, ayudas persistentes y mensajes comprensibles.
- RNF03 (compatibilidad): formulario adaptable y tabla desplazable dentro de su panel.
- RNF08 (mantenibilidad): React y CSS comunes, componentes pequeños y sin nuevas dependencias.

La navegación incluye solamente los módulos implementados. No se muestran accesos
a pantallas inexistentes, indicadores inventados ni datos de demostración permanentes.

## Paleta

Los cuatro colores de marca provienen del Plan de Proyecto:

| Variable CSS | Color | Aplicación |
| --- | --- | --- |
| `--marca-naranja` | `#EA6A25` | Marca, acentos y acción principal |
| `--marca-cian` | `#1B9FB5` | Identidad y borde de edición |
| `--marca-celeste` | `#5FC0D8` | Acento de navegación sobre fondo oscuro |
| `--blanco` | `#FFFFFF` | Superficies del formulario y listado |

Los colores complementarios están definidos en `src/index.css`:
texto oscuro, texto secundario, fondo gris claro, lateral oscuro y enlace cian oscuro.
Son tonos de apoyo de la interfaz, no cambios en la identidad aprobada.

El naranja de marca lleva texto oscuro en los botones para asegurar legibilidad.
El verde y el rojo representan estados operativos y mensajes, siempre acompañados
por texto: el usuario no necesita distinguir solamente el color.

El logotipo de `public/logo-faro.png` es la imagen extraída del Plan de Proyecto.
Se utiliza sin modificar su contenido.

## Tipografía y tamaños

- Fuente: Segoe UI y alternativas del sistema, todas sans serif. No depende de una descarga.
- Texto base: 16 px.
- Título de pantalla: entre 28 y 34 px según el ancho disponible.
- Títulos de panel: 18 px.
- Etiquetas, ayudas y datos: entre 12 y 15 px, con contraste y jerarquía.
- Campos y botones: altura mínima de 44 px.
- Espacios principales: 8, 16, 24 y 32 px.
- Paneles: esquinas de 12 px; controles: 7 u 8 px.

Las variables comunes se reutilizan desde `src/index.css`.
La estructura específica del módulo se encuentra en `src/App.css`.

## Componentes a reutilizar

### Encabezado de pantalla
Un único `h1`, una descripción breve y un contexto de módulo.
Los títulos deben describir la tarea con lenguaje municipal, no técnico.

### Panel
Usar `.panel` y `.panel-encabezado` para agrupar una tarea o información relacionada.
Evitar mezclar controles sin una jerarquía de títulos.

### Formulario
Conservar una etiqueta visible para cada control y relacionarla con `htmlFor` e `id`.
Las ayudas se muestran debajo del campo y se vinculan con `aria-describedby`.
Los campos obligatorios llevan asterisco y atributos HTML correspondientes.
Los ejemplos no reemplazan las etiquetas.

Durante el guardado se deshabilitan los controles y se indica “Guardando…”.
Si falla la solicitud se conservan los datos ingresados.
La edición se identifica por título, borde y texto, e incluye una acción de cancelación.

### Botones
- `.boton-primario`: acción principal (registrar o guardar cambios).
- `.boton-secundario`: cancelar o volver a cargar.
- `.boton-tabla`: editar un registro.
- `.boton-borrar`: borrar, manteniendo la confirmación existente.

Cada botón tiene texto. Los iconos son decorativos y están en `components/Icono.jsx`.
No agregar botones sin una acción real.

### Listado
Conservar HTML de tabla, encabezados de columna y nombre del lugar como encabezado de fila.
Los estados muestran “Funciona” o “Fuera de servicio”.
En pantallas pequeñas la tabla se desplaza horizontalmente dentro del panel y puede
recibir foco para usar el teclado. El resto de la página no debe desbordarse.

### Filtros de listados
Reutilizar `.bloque-filtros`, `.filtros-encabezado`, `.filtros` y los controles
`.campo`. Cada control tiene etiqueta visible e identificador propio con prefijo
`filtro-`, para diferenciarlo del formulario de alta/edición.

Los cambios filtran al instante la lista descargada, siguiendo la decisión del equipo
para Infraestructura. Mostrar “Mostrando X de Y”, una acción para limpiar los criterios
y un mensaje distinto cuando no hay coincidencias. En celular los campos van en una
columna; la tabla conserva su desplazamiento dentro del panel.

En OT, “Creada desde / hasta” usa la fecha de creación en Argentina, incluye ambos días
y permite un solo límite. Un rango invertido muestra un error bajo los controles.
Reutilizar las opciones de `utils/ordenesTrabajo.js` para no duplicar los enums.
El filtro “Estado” usa los estados que informa el backend, porque son configurables: no se escriben a mano.

### Estados de interfaz
- Cargando: texto e indicador visual.
- Sin registros: explicar cómo registrar el primer lugar.
- Error de carga: informar el fallo y permitir volver a cargar; no afirmar que la base está vacía.
- Guardado correcto: confirmación visible anunciada a tecnologías de asistencia.
- Foco: contorno visible para navegar por teclado.
- Movimiento reducido: respetar la preferencia del dispositivo.

### Línea de tiempo (Ficha histórica)
Lista ordenada (`ol.linea-tiempo`) de lo más reciente a lo más antiguo. Cada hito muestra la fecha,
el estado con su color y su texto, la descripción y los datos de la orden. El punto de la línea
repite el color del estado, pero el estado siempre está escrito.
Las fechas de inicio y de fin se muestran solo si el backend las informa.

Para elegir entre pocas vistas (Todos / Abiertos / Cerrados) se usa `.opciones-radio`: botones de opción
con etiqueta visible y área táctil de 44 px, dentro de un `fieldset` con `legend`.

### Mapa
El mapa usa Leaflet con mosaicos de OpenStreetMap (RNF10): es la única dependencia nueva del Sprint 2.
Cada lugar se pinta según su orden abierta más urgente (RNF11). Son tonos propios del mapa, elegidos para
distinguirse entre sí; las etiquetas de texto de las tablas conservan sus colores.

| Prioridad | Color | Tamaño de la marca |
| --- | --- | --- |
| Baja | `#1B9FB5` (cian de marca) | chico |
| Media | `#E5B200` | |
| Alta | `#EA6A25` (naranja de marca) | |
| Urgente | `#C0262D` | grande |
| Sin trabajos abiertos | `#9AA9B0` | el más chico |

También se puede colorear por estado, con los colores que informa el backend. La leyenda explica los colores.
Las marcas del mapa no se pueden recorrer con el teclado: la lista que acompaña al mapa tiene los mismos datos
escritos, con los botones "Ver en el mapa" y "Ficha histórica". Los filtros están plegados para que, en el celular,
el mapa no quede lejos del principio de la pantalla.

## Referencias

Se adaptaron criterios, sin copiar la estética ni incorporar paquetes de estos sistemas:

- [GOV.UK: campos de texto y ayudas](https://design-system.service.gov.uk/components/text-input/)
- [GOV.UK: tablas](https://design-system.service.gov.uk/components/table/)
- [W3C WAI: etiquetas de formularios](https://www.w3.org/WAI/tutorials/forms/labels/)
- [W3C: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Esta guía y las comprobaciones manuales no constituyen una certificación completa de accesibilidad.
