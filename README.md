# Faro

Proyecto full-stack con backend en Spring Boot y frontend en React.

## Stack

- **Backend**: Java 21, Spring Boot 4.1.1 (Maven), Spring Web, Spring Data JPA, PostgreSQL Driver.
- **Frontend**: React + Vite + ESLint.
- **Base de datos**: PostgreSQL 16.
- **Infraestructura local**: Docker + Docker Compose.

## Estructura del repositorio

```
.
├── backend/            # API Spring Boot
│   ├── Dockerfile
│   └── src/
├── frontend/           # SPA React + Vite
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── src/
├── docker-compose.yml
├── .env.example
└── CONTRIBUTING.md     # Flujo de trabajo del equipo (Git Flow, PRs, reglas)
```

## Cómo levantar el proyecto

### Requisitos

- Docker y Docker Compose instalados. No hace falta tener Java, Node ni Postgres en tu máquina.

### Pasos

```bash
git clone <URL-del-repo>
cd faro
cp .env.example .env
docker compose up --build
```

### Servicios

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

El frontend corre con hot-reload (los cambios en `frontend/` se reflejan sin reiniciar el contenedor). El backend requiere reconstruir la imagen ante cambios de código:

```bash
docker compose up --build backend
```

### Apagar el entorno

```bash
docker compose down
```

Para borrar también los datos de la base:

```bash
docker compose down -v
```

## Cómo contribuir

Antes de tu primera tarea, leé [CONTRIBUTING.md](./CONTRIBUTING.md): ahí está el flujo de ramas (Git Flow), las reglas de aprobación de Pull Requests y las convenciones de commits.

## Guia de interfaz

Para desarrollar las siguientes pantallas, consultar la [guia de estilos del frontend](./frontend/GUIA_ESTILOS.md). Define la paleta aprobada, tipografia, espacios, componentes, estados y criterios de accesibilidad de la interfaz del RF01.

El [avance de las pantallas base en Figma](./frontend/diseno/README.md) contiene el archivo editable, las pautas comunes y los pendientes de diseño. La entrega final está en preparación.

## Login y sesión del frontend

Ver [Login y sesión — Sprint 3](./frontend/LOGIN_SESION.md) para conocer el funcionamiento, las vistas por rol, las pruebas realizadas y los pendientes de coordinación con backend. Sigue la [guía de autenticación del equipo](./FRONTEND_AUTENTICACION_Y_ROLES.md).

La pantalla de acceso ya utiliza la API de autenticación. La protección por rol y cuadrilla de las API de negocio todavía debe completarse en el backend; ocultar acciones en el frontend no reemplaza esa validación.

## PWA: consulta local y cambios sin señal

- [Consulta local de tareas](./frontend/PWA_CONSULTA_LOCAL.md): el capataz guarda una copia de sus tareas y la abre sin señal.
- [Sincronización sin señal](./frontend/PWA_SINCRONIZACION.md): lo que se hace sin señal (iniciar/finalizar tareas, crear OT) se guarda en el celular, se manda solo cuando vuelve la red y el backend resuelve los conflictos (`/api/sincronizacion`). Incluye el aviso "Hay una versión nueva de FARO" después de cada deploy.

## Tests del backend

Los tests usan **JUnit 5** y **Mockito**. Se necesita **Java 21** instalado.

### Correr todos los tests
`BackendApplicationTests` levanta Spring completo y necesita la base de datos, así que primero hay que levantarla:

```bash
docker compose up db -d
cd backend
.\mvnw.cmd test      # Windows
./mvnw test          # Linux / Mac
```

### Correr solo los tests unitarios (no necesitan base de datos)

```bash
cd backend
.\mvnw.cmd test -Dtest="PuntoInfraestructuraServiceTest,GeometriaJsonTest"
```

También se pueden correr desde VS Code con la extensión **Extension Pack for Java** (botón ▶️ al lado de cada test).

## Filtros del frontend

Ver [alcance, dependencia del módulo de OT y pasos de prueba](frontend/FILTROS_LISTADOS.md).

Pruebas de filtros (datos en memoria, sin base de datos): desde `frontend`, ejecutar `npm test`.
Con el entorno Docker encendido: `docker compose exec -T frontend npm test`.

## Despliegue

El frontend y el backend están desplegados en Render y la base de datos en Neon. Ver [DESPLIEGUE.md](./DESPLIEGUE.md): direcciones, variables de entorno, cómo redesplegar y advertencias del plan gratis.

## Permisos por rol

La API exige iniciar sesión (token JWT) y valida el rol en cada operación: 401 sin token, 403 si al rol no le corresponde. Ver [la tabla de quién puede qué y cómo usar Swagger con login](./LOGIN_Y_ACCESOS_BACKEND.md#9-permisos-por-rol).

El encargado y la mesa de entradas gestionan el personal (altas, bajas, roles y claves) en **Más → Usuarios**: ver [Gestión de usuarios](./LOGIN_Y_ACCESOS_BACKEND.md#10-gestión-de-usuarios).
