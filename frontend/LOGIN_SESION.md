# Login y sesión — Sprint 3

Implementación del frontend sobre la guía `FRONTEND_AUTENTICACION_Y_ROLES.md`, conservando la navegación «El mapa primero», los componentes y los estilos actuales. No agrega dependencias.

## Funcionamiento

- El ingreso utiliza `POST /api/auth/login`. Muestra espera, errores y un botón para mostrar u ocultar la contraseña. La contraseña solo se envía al backend; no se guarda.
- `AuthProvider` mantiene el usuario actual. El token y el perfil se guardan con las claves acordadas `faro_token` y `faro_usuario`. Si el navegador bloquea el almacenamiento, el ingreso dura mientras siga abierta la página.
- Al recargar, se comprueba el vencimiento y se consulta `GET /api/auth/perfil`. No se concede acceso usando únicamente el perfil guardado. Si falla la conexión, se ofrece reintentar o volver al ingreso.
- `api/cliente.js` adjunta `Authorization: Bearer ...`. Una respuesta 401 de una petición autenticada limpia la sesión. Una respuesta 403 informa el error sin cerrar la sesión. El login no manda un token anterior.
- Se controla el vencimiento mientras la página está abierta y al recuperar el foco. El cierre se refleja entre pestañas mediante el evento `storage`. Una respuesta tardía de una sesión anterior no cierra una sesión nueva.
- Cerrar sesión elimina el token y el usuario del navegador y reinicia la navegación. El backend actual no ofrece revocación de tokens: un token previamente copiado conserva su validez hasta su vencimiento.

## Vistas y acciones

| Rol | Pantallas y acciones visibles |
| --- | --- |
| Encargado del corralón | Todas las pantallas existentes. Puede cargar, editar y asignar trabajos. Mantiene el selector de cuadrilla para supervisión. |
| Mesa de entradas | Mapa, carga y consulta de órdenes y ficha histórica. Sin edición de estados ni asignación de cuadrillas. |
| Capataz de cuadrilla | Inicia en Mis tareas; mapa y consulta de ficha histórica desde los trabajos. La cuadrilla se obtiene de `usuario.cuadrillaId`, sin selector. No puede crear ni asignar OT desde el mapa. |

Las cuentas inactivas y los roles desconocidos no habilitan el ingreso. Si el capataz no tiene una cuadrilla existente vinculada, se muestra un aviso para consultar al encargado.

## Archivos principales

- `src/context/AuthContext.jsx` y `useSesion.js`: estado compartido, ingreso, recuperación y cierre.
- `src/utils/sesion.js`: almacenamiento, vencimiento y aviso de cierre.
- `src/utils/permisos.js`: reglas de visibilidad por rol.
- `src/api/auth.js` y `cliente.js`: comunicación con la API.
- `src/pages/PaginaLogin.jsx`, `components/RutaProtegida.jsx` y `BarraUsuario.jsx`: interfaz de acceso y usuario conectado.
- `App.jsx` y `PaginaMisTareas.jsx`: navegación según rol y cuadrilla del perfil.
- `estilos-sesion.css`: ajustes de la pantalla de ingreso y cabecera, reutilizando las variables de FARO.

## Verificación

Ejecutar `npm test`, `npm run lint` y `npm run build` dentro de `frontend`. Las pruebas nuevas cubren almacenamiento y vencimiento, permisos, Bearer, login sin token, perfil, errores 401/403 y respuestas tardías.

Recorrido manual con el backend local:

1. Abrir FARO sin sesión. Comprobar campos obligatorios, correo válido, mostrar/ocultar contraseña y error con credenciales incorrectas.
2. Ingresar como encargado. Revisar nombre, rol, navegación y cerrar sesión. Volver a ingresar y recargar: debe recuperar el perfil.
3. Ingresar como mesa de entradas. Verificar carga/consulta de trabajos y ausencia de asignación, administración de lugares y cambios de estado.
4. Ingresar como capataz. Comprobar que abre Mis tareas con su cuadrilla fija, sin selector ni acciones de creación/asignación en el mapa.
5. Con dos pestañas de FARO, cerrar sesión en una. La otra debe volver al ingreso.
6. Repetir ingreso y navegación con ancho de celular y con teclado.

Las cuentas de demostración son las precargadas por `InicializadorUsuarios` en el backend: encargado, mesa de entradas y capataces verde/alumbrado. La clave inicial depende de `FARO_DEFAULT_PASSWORD`. No se publican claves en la pantalla de acceso.

### Resultado de la revisión local — 20/10/2026

- 128 pruebas del frontend aprobadas; 17 corresponden a sesión, permisos y cliente autenticado.
- ESLint y compilación de producción aprobados.
- Ingreso real con las cuentas locales de encargado, mesa de entradas y capataz verde; errores de credenciales, envío con Enter, mostrar/ocultar contraseña, recuperación tras recargar y cierre entre pestañas comprobados en el navegador.
- Revisados el formulario y la navegación con anchos de celular de 320 y 390 px, sin desborde horizontal. El capataz abre Mis tareas con Cuadrilla Verde y sin selector manual.
- No se crearon ni modificaron OT, lugares o cuadrillas para estas comprobaciones. La base local no tiene tareas asignadas a Cuadrilla Verde; el cambio de estado de una tarea desde esa cuenta queda pendiente de comprobar con datos de prueba acordados por el equipo.

## Coordinación pendiente con backend

**La visibilidad del frontend no reemplaza la autorización del servidor.** En la configuración actual, `/auth/perfil` requiere autenticación pero las API de negocio todavía usan `permitAll()`. El equipo de backend debe exigir autenticación y validar roles y pertenencia de cuadrilla en cada operación antes de utilizar FARO con datos reales. El filtrado local de Mis tareas no impide consultar otras OT directamente a la API actual.

La persistencia en `localStorage` sigue la guía del equipo; un script ejecutado en el mismo origen podría leer el token. No es una cookie HttpOnly. No se agrega un mecanismo de renovación ni se modifica el contrato de autenticación.

La administración de usuarios/roles y la PWA/offline corresponden a sus tarjetas separadas y no forman parte de este cambio.
