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
