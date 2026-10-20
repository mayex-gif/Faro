# Guía de Desarrollo del Frontend: Autenticación, Sesiones y Roles
**Sistema FARO — Municipalidad de Estación General Paz**  
*Especificación técnica y plan de implementación para el Frontend en React*

---

## 1. Objetivo

Implementar en la SPA de React la interfaz de inicio de sesión (**Login**), la gestión de sesión persistente con tokens JWT, la inyección automática de credenciales en el cliente HTTP, las rutas protegidas y la adaptación de vistas según el rol del usuario municipal.

---

## 2. Arquitectura Propuesta para el Frontend

```
┌────────────────────────────────────────────────────────────────────────┐
│                              APP (React 18)                            │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    AuthProvider (AuthContext)                    │  │
│  │  - Estado global: { usuario, token, estaAutenticado, cargando }  │  │
│  │  - Métodos: login(email, password), logout(), tieneRol(roles)    │  │
│  │  - Persistencia: localStorage ('faro_token', 'faro_usuario')     │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│             ┌───────────────────────┴───────────────────────┐          │
│             ▼                                               ▼          │
│  ┌───────────────────────┐                     ┌────────────────────┐  │
│  │   PaginaLogin.jsx     │                     │   RutaProtegida    │  │
│  │   (Ruta pública)      │                     │   (Valida sesión   │  │
│  │   - Formulario login  │                     │    y roles)        │  │
│  │   - Errores visuales  │                     └─────────┬──────────┘  │
│  └───────────────────────┘                               │             │
│                                             ┌────────────┴───────────┐ │
│                                             ▼                        ▼ │
│                                      [Vistas de Oficina]   [Mis Tareas]│
│                                      (Encargado / Mesa)     (Capataz)  │
└─────────────────────────────────────────────┬──────────────────────────┘
                                              │
                                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENTE HTTP (api/cliente.js)                   │
│  - Interceptor Request:  Inyecta Authorization: Bearer <token>         │
│  - Interceptor Response: Ante 401 Unauthorized -> logout() y redirige  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Componentes y Módulos a Crear

### 3.1. Cliente de Autenticación (`frontend/src/api/auth.js`)
Módulo encargado de comunicarse con los endpoints `/api/auth`:

```javascript
import { pedirApi } from './cliente';

export async function iniciarSesion(email, password) {
  return pedirApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function obtenerPerfil() {
  return pedirApi('/api/auth/perfil');
}

export async function validarToken(token) {
  return pedirApi('/api/auth/validar', {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

---

### 3.2. Contexto de Autenticación (`frontend/src/context/AuthContext.jsx`)
Mantiene el estado global de la sesión en toda la aplicación.

* **Estados requeridos**:
  * `usuario`: Objeto con `{ id, nombre, apellido, email, rol, cuadrillaId, activo }` o `null`.
  * `token`: Cadena JWT o `null`.
  * `cargando`: Booleano para evitar parpadeos durante la comprobación inicial del `localStorage`.
  * `estaAutenticado`: `Boolean(token && usuario)`.
* **Funcionalidades**:
  * **Al montar**: Lee `faro_token` y `faro_usuario` de `localStorage`. Si existen, valida opcionalmente con `/api/auth/perfil`.
  * **`login(email, password)`**: Llama a `iniciarSesion()`, almacena token y usuario en `localStorage`, actualiza el estado y redirige a la vista principal según el rol.
  * **`logout()`**: Borra `faro_token` y `faro_usuario` de `localStorage`, resetea el estado y envía al usuario a la pantalla de login.
  * **`tieneRol(...rolesPermitidos)`**: Función auxiliar para verificar si el usuario logueado posee alguno de los roles indicados.

---

### 3.3. Actualización de `frontend/src/api/cliente.js`
En el cliente HTTP base de la aplicación se deben incorporar dos comportamientos esenciales:

1. **Inyección de Cabecera**:
   * Leer el token almacenado (`localStorage.getItem('faro_token')`).
   * Si existe, agregar automáticamente `Authorization: Bearer ${token}` a todas las peticiones salientes.
2. **Manejo de Respuestas 401**:
   * Si cualquier llamada a la API devuelve código `401 Unauthorized`:
     * Limpiar el almacenamiento local.
     * Notificar al usuario (sesión expirada).
     * Redirigir a la pantalla de login.

---

### 3.4. Pantalla de Inicio de Sesión (`frontend/src/pages/PaginaLogin.jsx`)
Interfaz limpia y accesible diseñada bajo la [Guía de Estilos de FARO](./frontend/GUIA_ESTILOS.md):

* **Elementos visuales**:
  * Encabezado institucional: Logotipo o isotipo de FARO y nombre de la Municipalidad de Estación General Paz.
  * Campo **Correo electrónico** (`type="email"`, `autocomplete="email"`, validación de formato).
  * Campo **Contraseña** (`type="password"`, `autocomplete="current-password"`, opción visual de "mostrar/ocultar contraseña").
  * Botón de acción principal: *"Iniciar sesión"* (área táctil de al menos 48px, estado deshabilitado con spinner mientras la petición está en curso).
  * Mensajes de alerta: Banner de error claro en caso de credenciales incorrectas (`401`) o usuario desactivado (`409`).
  * Sección colapsable o tarjeta informativa con cuentas de prueba del municipio para agilizar las demostraciones y testing.

---

### 3.5. Componente de Enrutamiento Protegido (`frontend/src/components/RutaProtegida.jsx`)
Envuelve a los componentes o páginas que requieren autenticación:

* Si `cargando` es `true`, muestra un indicador de carga accesible.
* Si `estaAutenticado` es `false`, redirige inmediatamente a `PaginaLogin.jsx`.
* Si se especifican `rolesPermitidos` y el usuario actual no cuenta con ellos:
  * Muestra una pantalla o mensaje amigable de *"Acceso no autorizado"* o redirige a la vista adecuada para su rol (por ejemplo, a "Mis tareas" si es capataz).

---

### 3.6. Cabecera y Menú Adaptable por Rol (`BarraNavegacion.jsx`)
Evolucionar la barra superior y lateral de la SPA:

* **Información del operador**: Mostrar en la esquina superior el nombre del usuario logueado y una etiqueta con su rol (*Encargado*, *Capataz*, *Mesa de Entradas*).
* **Botón Cerrar Sesión**: Botón accesible para cerrar sesión en cualquier momento.
* **Menú filtrado por rol**:
  * **Encargado del Corralón (`ENCARGADO_CORRALON`)**: Acceso total (Infraestructura, Órdenes de Trabajo, Asignación de Cuadrillas, Mapa, Ficha Histórica, Mis Tareas).
  * **Mesa de Entradas (`MESA_ENTRADAS`)**: Órdenes de Trabajo (para carga y consulta de reclamos), Mapa y Ficha Histórica.
  * **Capataz de Cuadrilla (`CAPATAZ_CUADRILLA`)**: Acceso directo y prioritario a "Mis tareas" de su cuadrilla asignada y al Mapa.

---

### 3.7. Evolución de la Pantalla "Mis Tareas" (`PaginaMisTareas.jsx`)

Actualmente, [PaginaMisTareas.jsx](./frontend/src/pages/PaginaMisTareas.jsx) contiene un selector desplegable manual donde el capataz debe elegir qué cuadrilla representa y la guarda en `localStorage`.

**Cambios a realizar**:
1. Conectar la pantalla al `AuthContext`.
2. Si el usuario logueado es `CAPATAZ_CUADRILLA`:
   * **Eliminar el desplegable manual de selección de cuadrilla**.
   * Usar directamente `usuario.cuadrillaId` para filtrar las órdenes de trabajo.
   * Mostrar el título de la cuadrilla asociada de forma fija y personalizada (ej. *"Mis Tareas — Cuadrilla Verde"*).
3. Si el usuario logueado es `ENCARGADO_CORRALON`:
   * Mantener o permitir la selección de cuadrilla a modo de supervisión global.

---

## 4. Estructura de Archivos a Crear / Modificar en Frontend

```
frontend/src/
├── api/
│   ├── auth.js                 <-- NUEVO: llamadas a /api/auth/*
│   └── cliente.js              <-- MODIFICAR: inyectar token Bearer y manejar 401
├── context/
│   └── AuthContext.jsx         <-- NUEVO: estado global de autenticación
├── components/
│   ├── RutaProtegida.jsx       <-- NUEVO: guard de rutas y roles
│   ├── BarraUsuario.jsx        <-- NUEVO: avatar, nombre, rol y botón Salir
│   └── ...
├── pages/
│   ├── PaginaLogin.jsx         <-- NUEVO: pantalla accesible de login
│   └── PaginaMisTareas.jsx     <-- MODIFICAR: vincular a usuario.cuadrillaId
└── App.jsx                     <-- MODIFICAR: envolver con AuthProvider y Rutas
```

---

## 5. Pautas de Accesibilidad (WCAG 2.2) y Usabilidad

* **Foco y Teclado**: El formulario de login debe poder completarse y enviarse enteramente mediante la tecla `Enter` y recorrerse con `Tab`. Los estados de error deben tener foco programático o atributos `aria-live="polite"` para lectores de pantalla.
* **Contraste de Color**: Cumplir con la relación de contraste mínima de `4.5:1` para textos y `3:1` para controles interactivos conforme a la guía de diseño de FARO.
* **Tamaños Táctiles**: En móviles, los campos de entrada y botones deben tener una altura mínima de `48px` (área de toque recomendada).

---

## 6. Plan de Pruebas Automatizadas del Frontend

Añadir pruebas con el ejecutor nativo de Node.js (`npm test`):
1. **`auth.test.js`**: Pruebas sobre la lógica de almacenamiento de tokens, expiración y obtención de datos de usuario.
2. **`permisos.test.js`**: Pruebas de la función `tieneRol()` verificando accesos permitidos y denegados según el rol del usuario.
3. **`clienteAuth.test.js`**: Simulación de inyección de encabezado `Authorization: Bearer <token>` y captura del error `401`.
