# Módulo de Autenticación y Acceso de Usuarios (Backend)
**Sistema FARO — Municipalidad de Estación General Paz**  
*Documentación técnica del Módulo de Seguridad y Emisión de Tokens JWT*

---

## 1. Resumen de la Implementación

En el marco del **Sprint 3**, se desarrolló el núcleo de seguridad y autenticación del backend de FARO. La solución implementa autenticación basada en credenciales (correo electrónico y contraseña), encriptación con **BCrypt**, control de sesión sin estado (**Stateless**) y emisión de credenciales digitales mediante **JSON Web Tokens (JWT)** firmados con el algoritmo HMAC-SHA256 (`HS256`).

Este módulo sienta las bases de control de acceso para que cada operador del municipio acceda al sistema según su función, sin requerir aún un módulo administrativo completo de gestión de usuarios y roles.

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
  * `409 Conflict`: Usuario desactivado por administración (`"La cuenta de usuario se encuentra desactivada"`).

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
