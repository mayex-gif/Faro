# Módulo de Autenticación y Acceso de Usuarios (Backend)
**Sistema FARO — Municipalidad de Estación General Paz**  
*Documentación técnica del Módulo de Seguridad y Emisión de Tokens JWT*

---

## 1. Resumen de la Implementación

En el marco del **Sprint 3**, se desarrolló el núcleo de seguridad y autenticación del backend de FARO. La solución implementa autenticación basada en credenciales (correo electrónico y contraseña), encriptación con **BCrypt**, control de sesión sin estado (**Stateless**) y emisión de credenciales digitales mediante **JSON Web Tokens (JWT)** firmados con el algoritmo HMAC-SHA256 (`HS256`).

Este módulo sienta las bases de control de acceso para que cada operador del municipio acceda al sistema según su función. La gestión del personal (altas, bajas, cambios de rol y claves) se agregó después: ver [10. Gestión de usuarios](#10-gestión-de-usuarios).

---

## 2. Arquitectura y Stack de Seguridad

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Frontend / Móvil)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       1. POST /api/auth/login      │      2. GET /api/...
       { email, password }          │         Header: Authorization: Bearer <jwt>
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SPRING SECURITY FILTER CHAIN                    │
│                                                                        │
│  [ CorsFilter ] ──► [ CsrfFilter (disabled) ]                          │
│                                │                                       │
│                                ▼                                       │
│              [ JwtAuthenticationFilter ]                               │
│              - Extrae "Bearer <token>"                                 │
│              - Valida firma HS256 y expiración (JwtService)            │
│              - Carga UserDetails en SecurityContextHolder              │
│                                │                                       │
│                                ▼                                       │
│              [ AuthorizationFilter ]                                   │
│              - /api/auth/login  ──► PermitAll                          │
│              - /api/auth/perfil ──► Authenticated                      │
│              - /api/auth/validar ─► PermitAll                          │
│              - /swagger-ui/**   ──► PermitAll                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE CONTROLADORES                          │
│                      [ AutenticacionController ]                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           CAPA DE SERVICIOS                            │
│                        [ AutenticacionService ]                        │
│             - Valida credenciales con AuthenticationManager            │
│             - Comprueba cuenta activa (!isActivo -> 409)               │
│             - Genera token JWT con claims personalizados               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BASE DE DATOS (Neon PostgreSQL)                  │
│  Tabla 'usuarios': contraseñas con hash BCrypt ($2a$10$...)            │
└────────────────────────────────────────────────────────────────────────┘
```

### Tecnologías Incorporadas
* **Spring Boot Starter Security**: Motor de autenticación y autorización de Spring Framework.
* **JJWT 0.12.6** (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`): Generación y validación de tokens JWT estándar RFC 7519.
* **BCrypt**: Función hash adaptativa de 10 rondas para el almacenamiento seguro de contraseñas.

---

## 3. Modelo de Datos

### 3.1. Entidad `Usuario` (`usuarios`)
Mapeada en `com.faro.backend.models.Usuario`:
* `id` (`BIGINT`, PK autonumérica).
* `nombre` (`VARCHAR(100)`, obligatorio).
* `apellido` (`VARCHAR(100)`, obligatorio).
* `email` (`VARCHAR(150)`, único, obligatorio, normalizado a minúsculas).
* `password` (`VARCHAR(255)`, hash BCrypt, obligatorio).
* `rol` (`VARCHAR(50)`, obligatorio, Enum `RolUsuario`).
* `cuadrillaId` (`BIGINT`, opcional, FK conceptual a `cuadrillas`).
* `activo` (`BOOLEAN`, por defecto `true`).
* `fechaCreacion` (`TIMESTAMP`, auditoría de alta).

### 3.2. Enum de Roles `RolUsuario`
Definido en `com.faro.backend.models.RolUsuario`:
1. `ENCARGADO_CORRALON`: Administrador y responsable general de infraestructura, cuadrillas y órdenes.
2. `CAPATAZ_CUADRILLA`: Responsable operativo en calle; ejecuta y avanza tareas de su cuadrilla específica.
3. `MESA_ENTRADAS`: Personal de atención y recepción vecinal; ingresa reclamos e inspecciones.

---

## 4. Endpoints de Autenticación (`/api/auth`)

### 4.1. Iniciar Sesión: `POST /api/auth/login`
Valida las credenciales del usuario y genera su token de sesión.

* **Acceso**: Público (`permitAll`).
* **Cuerpo de la Petición (`LoginRequestDTO`)**:
```json
{
  "email": "encargado@generalpaz.gob.ar",
  "password": "Faro2026!"
}
```
* **Respuesta Exitosa (`200 OK` - `LoginResponseDTO`)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlbmNhcmdhZG9AZ2VuZXJhbHBhei5nb2IuYXIiLCJpZCI6MSwibm9tYnJlIjoiTWFydMOtbiIsImFwZWxsaWRvIjoiR8OzbWV6Iiwicm9sIjoiRU5DQVJHQURPX0NPUlJBTE9OIiwiZXhwIjoxNzk0Nzg5ODAwfQ...",
  "tipoToken": "Bearer",
  "expiraEn": 86400000,
  "usuario": {
    "id": 1,
    "nombre": "Martín",
    "apellido": "Gómez",
    "email": "encargado@generalpaz.gob.ar",
    "rol": "ENCARGADO_CORRALON",
    "cuadrillaId": null,
    "activo": true
  }
}
```
* **Códigos de Error**:
  * `400 Bad Request`: Formato de email inválido o campos obligatorios vacíos.
  * `401 Unauthorized`: Contraseña o correo incorrectos (`"Correo o contraseña incorrectos"`).
  * `409 Conflict`: Usuario desactivado por administración (`"La cuenta de usuario se encuentra desactivada"`). Solo si la contraseña es **correcta**: con una cuenta dada de baja y la contraseña incorrecta responde 401, igual que un correo que no existe (así no se puede averiguar qué correos existen). Ver §10.5.

### 4.2. Consultar Perfil Actual: `GET /api/auth/perfil`
Devuelve la información de la cuenta autenticada que realiza la petición.

* **Acceso**: Protegido (`authenticated()`).
* **Encabezado Obligatorio**: `Authorization: Bearer <token_jwt>`
* **Respuesta Exitosa (`200 OK` - `UsuarioDTO`)**:
```json
{
  "id": 1,
  "nombre": "Martín",
  "apellido": "Gómez",
  "email": "encargado@generalpaz.gob.ar",
  "rol": "ENCARGADO_CORRALON",
  "cuadrillaId": null,
  "activo": true
}
```
* **Error**: `401 Unauthorized` si no se envía token o el token expiró/es inválido.

### 4.3. Validar Token: `GET /api/auth/validar`
Endpoint de utilidad para verificar rápidamente la validez de una sesión desde clientes o aplicaciones externas.

* **Acceso**: Público (la validación se realiza sobre el header `Authorization`).
* **Encabezado**: `Authorization: Bearer <token_jwt>`
* **Respuesta Exitosa (`200 OK`)**: Devuelve el `UsuarioDTO` asociado al token si es válido.
* **Error**: `401 Unauthorized` si el token es inválido o expiró.

---

## 5. Cuentas Municipales Precargadas (`InicializadorUsuarios`)

Para facilitar el desarrollo local, las pruebas automatizadas y la verificación en la nube (Neon/Render), el componente `InicializadorUsuarios` crea automáticamente las siguientes cuentas si la tabla `usuarios` se encuentra vacía:

| Nombre Completo | Correo Electrónico | Contraseña Inicial | Rol | Cuadrilla Vinculada |
|---|---|---|---|---|
| **Martín Gómez** | `encargado@generalpaz.gob.ar` | `Faro2026!` | `ENCARGADO_CORRALON` | *Ninguna* (Acceso global) |
| **Carlos Rodríguez** | `capataz.verde@generalpaz.gob.ar` | `Faro2026!` | `CAPATAZ_CUADRILLA` | `1` (Cuadrilla Verde) |
| **Juan López** | `capataz.alumbrado@generalpaz.gob.ar` | `Faro2026!` | `CAPATAZ_CUADRILLA` | `2` (Cuadrilla Alumbrado) |
| **Ana Martínez** | `mesadeentradas@generalpaz.gob.ar` | `Faro2026!` | `MESA_ENTRADAS` | *Ninguna* (Mesa de entradas) |

> [!NOTE]
> Las contraseñas se almacenan cifradas con salt individual de BCrypt. Nunca se guardan contraseñas en texto plano.

---

## 6. Configuración de Entorno y Propiedades

En `application.properties`:
```properties
# JWT - Clave secreta (mínimo 256 bits para HS256) y duración del token (24 horas)
faro.jwt.secret=${FARO_JWT_SECRET:faro-municipalidad-estacion-general-paz-clave-secreta-jwt-segura-2026}
faro.jwt.expiration-ms=${FARO_JWT_EXPIRATION_MS:86400000}
```

* **`FARO_JWT_SECRET`**: Clave criptográfica para la firma de tokens. En Render y producción se recomienda definir una clave aleatoria de al menos 64 caracteres.
* **`FARO_JWT_EXPIRATION_MS`**: Tiempo de vida del token en milisegundos (por defecto 24 horas: `86400000`).

---

## 7. Manejo Centralizado de Excepciones

Se integraron manejadores específicos en `ManejadorDeErrores.java`:
* `BadCredentialsException`: Devuelve HTTP 401 con JSON estructurado `{ "estado": 401, "mensaje": "Correo o contraseña incorrectos", "errores": {} }`.
* `AccessDeniedException`: Devuelve HTTP 403 `{ "estado": 403, "mensaje": "No tiene permisos para realizar esta acción", "errores": {} }`.
* El `AuthenticationEntryPoint` de Spring Security intercepta peticiones no autenticadas en el filtro devolviendo el mismo formato JSON (evitando páginas HTML por defecto de Spring).

---

## 8. Calidad y Suite de Pruebas

Se incorporaron **28 nuevas pruebas unitarias y de integración** en el backend:
* **`JwtServiceTest`** (8 pruebas): Generación, extracción de claims (nombre, apellido, rol, cuadrilla), verificación de firmas, detección de manipulación y expiración de tokens.
* **`AutenticacionServiceTest`** (10 pruebas): Flujo de login exitoso, rechazo por contraseña errónea, rechazo por usuario inactivo, recuperación de perfil y validación de cabeceras Bearer.
* **`AutenticacionControllerTest`** (8 pruebas con MockMvc): Verificación de respuestas HTTP 200, 400, 401 y 409, y validación de DTOs con `@Valid`.
* **`InicializadorUsuariosTest`** (2 pruebas): Carga condicional en base vacía y prevención de duplicación.

**Estado global**: **140 pruebas de backend aprobadas (100% éxito)** y **0 regresiones** sobre los módulos existentes (infraestructura, órdenes de trabajo, cuadrillas y eventos).

---

## 9. Permisos por rol

Tarjeta del Sprint 3 "Agregar las validaciones por roles en el backend". Antes, `SecurityConfig` terminaba con `anyRequest().permitAll()`: cualquiera podía crear, editar o borrar sin iniciar sesión y los permisos solo los controlaba la pantalla. Ahora el backend valida lo mismo que el frontend (`frontend/src/utils/permisos.js`).

### 9.1. Tres controles, en orden

1. **Sesión** (`SecurityConfig`): toda la API exige un token válido (`anyRequest().authenticated()`). Sin token, con uno vencido o inválido, o con el de una cuenta dada de baja (`JwtAuthenticationFilter` revisa `isEnabled()` en cada pedido) → **401**. Quedan abiertos: `/api/auth/login`, `/api/auth/validar`, Swagger (`/swagger-ui/**`, `/v3/api-docs/**`) y `/error`. El preflight CORS (OPTIONS) sigue pasando sin token.
2. **Rol** (`@PreAuthorize` en cada método del controller): si el rol no alcanza → **403** `"No tiene permisos para realizar esta acción"`. El service no llega a ejecutarse.
3. **Pertenencia** (en `OrdenTrabajoService.cambiarEstado`): el capataz solo puede cambiar el estado de las órdenes asignadas a **su** cuadrilla (`Usuario.cuadrillaId`). Si la orden es de otra cuadrilla o no tiene cuadrilla → **403** `"Esta orden no es de tu cuadrilla"` (`SinPermisoException`).

### 9.2. Quién puede qué

| Endpoint | Encargado | Mesa de entradas | Capataz |
|---|:-:|:-:|:-:|
| Todos los `GET` (lugares, historia, OT, estados, cuadrillas, perfil) | ✓ | ✓ | ✓ |
| `POST /api/infraestructura` (agregar lugar) | ✓ | ✓ | ✗ |
| `PUT` y `DELETE /api/infraestructura/{id}` | ✓ | ✗ | ✗ |
| `POST /api/ordenes-trabajo` (crear OT) | ✓ | ✓ | ✗ |
| `PUT /api/ordenes-trabajo/{id}` (editar OT) | ✓ | ✗ | ✗ |
| `PATCH /api/ordenes-trabajo/{id}/cuadrilla` y `/reasignacion` | ✓ | ✗ | ✗ |
| `PATCH /api/ordenes-trabajo/{id}/estado` | ✓ (cualquier OT) | ✗ | solo OT de su cuadrilla |
| `PUT /api/sincronizacion/cambios-estado/{operacionId}` (cambio hecho sin señal) | ✓ (cualquier OT) | ✗ | solo OT de su cuadrilla (si ya no es suya: 409 `OTRA_CUADRILLA`) |
| `PUT /api/sincronizacion/altas-orden/{operacionId}` (OT cargada sin señal) | ✓ | ✓ | ✗ |
| `GET /api/usuarios` (listar el personal) | ✓ | ✓ | ✗ |
| `POST /api/usuarios`, `PUT /api/usuarios/{id}` | ✓ | ✓ | ✗ |
| `PATCH /api/usuarios/{id}/activo` y `/clave` | ✓ | ✓ | ✗ |

Los dos `PUT /api/sincronizacion/...` reciben lo que se hizo en el celular sin señal: aplican las mismas reglas, una sola vez por número de operación, y responden 409 con el motivo si la OT cambió mientras tanto (ver [frontend/PWA_SINCRONIZACION.md](./frontend/PWA_SINCRONIZACION.md#3-backend-la-ventanilla-de-comandas-atrasadas)).

Un rol nuevo (por ejemplo, uno de solo lectura) no aparece en ningún `@PreAuthorize`: puede consultar pero no escribir, sin tocar nada más. Excepción a "todos los GET abiertos": el listado del personal (`GET /api/usuarios`) es solo para encargado y mesa.

### 9.3. Swagger con login

Swagger tiene el botón **Authorize** (`config/OpenApiConfig.java`):

1. `POST /api/auth/login` → **Try it out** → email y contraseña → **Execute**.
2. Copiar el valor de `token` (sin comillas).
3. **Authorize** (arriba a la derecha) → pegarlo en **Value** → **Authorize** → **Close**.
4. Desde ahí Swagger manda `Authorization: Bearer <token>` en cada **Execute**. Para cambiar de usuario: **Authorize → Logout** y repetir.

### 9.4. Pruebas

* **`PuertaCerradaTest`**: sin token → 401 con el formato de FARO; con sesión → 200; login y preflight abiertos.
* **`PermisosInfraestructuraTest`** y **`PermisosOrdenesTest`**: cada endpoint que escribe, con cada rol (puede / 403).
* **`OrdenTrabajoServicePermisosTest`**: capataz con OT de su cuadrilla, de otra, sin cuadrilla; encargado; mesa.
* **`OrdenTrabajoControllerEstadoTest`**: el usuario del token llega al service y el 403 "no es de tu cuadrilla".

Los demás tests de controllers (`@WebMvcTest`) no cargan `SecurityConfig` y prueban solo el controller. Los de permisos la importan a propósito (`@Import(SecurityConfig.class)`) y simulan el usuario con `user(...)` de `spring-security-test` (usuarios de prueba en `UsuariosDePrueba`).

---

## 10. Gestión de usuarios

Tarjeta del Sprint 3 **"12. Gestión de Usuarios y Roles"**: ABM del personal integrado con Spring Security y la pantalla **Usuarios** del frontend (menú **Más**).

### 10.1. Decisiones del equipo (25/10/2026)

1. **Quién administra:** el encargado del corralón **y** la mesa de entradas, con los **mismos permisos**. El capataz no (403). Más adelante, el rol Intendente (Product Backlog).
   > [!WARNING]
   > Decisión consciente: como la mesa puede todo, también puede crear un encargado, cambiarse a sí misma a encargado o restablecerle la clave al encargado. Si se quiere evitar, hay que agregar en `UsuarioService` la regla "la mesa no toca cuentas de encargado ni asigna ese rol" (403).
2. **Baja = desactivar** (`activo = false`). No hay `DELETE`: la persona sigue en la lista y en la historia de los trabajos, y se puede reactivar.
3. **Clave inicial:** la escribe quien da el alta y se puede **restablecer** desde la pantalla. "Cambiar mi propia clave" queda para más adelante.
4. **Roles fijos:** los tres de `RolUsuario`. Asignar un rol es elegir uno de esos; no se crean roles nuevos (un valor nuevo del enum choca con el `CHECK` que Hibernate creó en las bases existentes, incluida Neon).

### 10.2. Endpoints (`UsuarioController`, todos con `hasAnyRole('ENCARGADO_CORRALON','MESA_ENTRADAS')`)

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /api/usuarios` | — | 200: lista de `UsuarioDTO` (activos y dados de baja, por apellido). **Nunca** incluye la clave. |
| `POST /api/usuarios` | `nombre`, `apellido`, `email`, `rol`, `cuadrillaId` (solo capataz), `clave` | 201: el usuario creado (activo). |
| `PUT /api/usuarios/{id}` | `nombre`, `apellido`, `email`, `rol`, `cuadrillaId` (sin clave) | 200: el usuario actualizado. |
| `PATCH /api/usuarios/{id}/activo` | `{ "activo": false }` baja / `true` reactivar | 200: el usuario actualizado. |
| `PATCH /api/usuarios/{id}/clave` | `{ "clave": "..." }` | 204: sin cuerpo. |

### 10.3. Reglas (en `UsuarioService`)

| Regla | Respuesta |
|---|---|
| Campos obligatorios, email con formato válido, clave de 8 a 72 caracteres | 400 con el campo en `errores` |
| Email repetido (sin importar mayúsculas; se guarda en minúsculas). Al modificar, dejar el propio email no cuenta como repetido | 409 `"Ya existe un usuario con ese email"` |
| Capataz sin cuadrilla | 409 `"El capataz tiene que tener una cuadrilla a cargo"` |
| Capataz con una cuadrilla que no existe | 404 `"Cuadrilla no encontrada"` |
| Otro rol con `cuadrillaId` | Se ignora (queda vacía). Si un capataz pasa a otro rol, se le borra la cuadrilla |
| Darse de baja a sí mismo | 409 `"No te podés dar de baja a vos mismo"` |
| Dar de baja o cambiarle el rol al **último encargado activo** | 409 (el corralón quedaría sin encargado) |
| Usuario que no existe | 404 `"Usuario no encontrado"` |

La clave se guarda con `PasswordEncoder` (BCrypt) y nunca se devuelve ni se registra en el log.

### 10.4. Qué pasa con la sesión de la persona

* **Baja:** rige desde el **pedido siguiente**. El usuario se lee de la base en cada pedido y `JwtAuthenticationFilter` solo autentica si la cuenta está activa, así que su token viejo recibe **401** y el front cierra la sesión. Antes de esta tarjeta, el token seguía sirviendo hasta vencer (24 h).
* **Cambio de rol:** el backend lo aplica en el pedido siguiente; la pantalla lo muestra recién cuando la persona vuelve a entrar (el perfil se guarda al iniciar sesión).
* **Cambio de email:** el token va atado al email, así que la sesión de esa persona se cierra (401) y tiene que entrar con el email nuevo.
* **Restablecer clave:** la clave vieja deja de servir para iniciar sesión, pero un token ya emitido sigue valiendo hasta vencer (no hay revocación de tokens). Para cortar el acceso en el momento, dar de baja la cuenta. Ojo: si después se la reactiva, un token viejo que no haya vencido vuelve a servir.

### 10.5. Login de una cuenta dada de baja

`SecurityConfig.authenticationProvider` revisa **primero la contraseña y después si la cuenta está activa** (por defecto Spring lo hace al revés). Con la contraseña correcta, `AutenticacionService` convierte el `DisabledException` en **409** y la pantalla de login muestra "Tu cuenta está desactivada. Consultá al encargado del corralón". Con la contraseña incorrecta responde **401**, como cualquier error de credenciales.

### 10.6. Pantalla Usuarios (frontend)

* `src/pages/PaginaUsuarios.jsx`, `components/FormularioUsuario.jsx`, `components/TablaUsuarios.jsx`, `estilos-usuarios.css`.
* `src/api/usuarios.js` (las 5 llamadas) y `src/utils/usuarios.js` (validación del formulario, pedido limpio, filtros, motivo para no dar de baja), con pruebas en `tests/usuarios.test.js`.
* `utils/permisos.js`: vista `usuarios` para encargado y mesa (`puedeGestionarUsuarios`); `utils/navegacion.js`: "Usuarios" en el menú **Más**.
* Confirmaciones en pantalla (sin `window.confirm`): aviso "¿Dar de baja a …?" y campo para la clave nueva. Donde no se puede dar de baja, en lugar del botón se muestra el motivo ("Es tu cuenta", "Es el único encargado activo").

### 10.7. Para hacer después del despliegue

Las cuentas precargadas (§5) se crearon con la clave inicial por defecto, que está escrita en el repositorio. Con esta pantalla, el encargado puede **restablecer la clave** de cada cuenta de la nube (Render/Neon) desde **Más → Usuarios → Clave**. Las claves nuevas no se escriben en el repo, los docs ni el chat.

### 10.8. Pruebas

* **`JwtAuthenticationFilterTest`**: token válido de una cuenta desactivada → no autentica.
* **`PermisosUsuariosTest`**: cada endpoint con cada rol (encargado y mesa sí, capataz 403, sin token 401).
* **`UsuarioServiceTest`**, **`UsuarioServiceAltaTest`**, **`UsuarioServiceModificacionTest`**, **`UsuarioServiceBajaYClaveTest`**: reglas de la tabla 10.3.
* **`UsuarioControllerAltaTest`**, **`UsuarioControllerModificacionTest`**, **`UsuarioControllerBajaYClaveTest`**: validaciones (400), respuestas (201/204/404/409) y que la clave nunca vuelve.
* **`LoginCuentaDadaDeBajaTest`** y **`AutenticacionServiceCuentaDeBajaTest`**: login de cuenta dada de baja (409 con la clave correcta, 401 con la incorrecta).
* Frontend: `tests/usuarios.test.js` (21), más `permisos.test.js` y `navegacion.test.js` actualizados.

Total al cerrar la tarjeta: **261 pruebas de backend** y **166 de frontend**.
